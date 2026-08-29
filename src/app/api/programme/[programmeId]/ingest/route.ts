import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createMspIngestionService } from '@/composition/mspIngestionComposition';
import { isSuccess } from '@/lib/result';

// Max upload size: 120 MB to accommodate 95 MB official JKR test fixture with headroom
const MAX_FILE_SIZE_BYTES = 120 * 1024 * 1024;

/**
 * POST /api/programme/[programmeId]/ingest
 * Ingests an MSP XML project file into canonical programme_revision and task tables.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ programmeId: string }> }
) {
  try {
    const { programmeId } = await params;

    if (!programmeId || typeof programmeId !== 'string' || programmeId.trim() === '') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: programmeId' },
        { status: 400 }
      );
    }

    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') ?? '';
    let fileName = 'ingested_project.xml';
    let fileBuffer: Buffer;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json(
          { error: 'Missing uploaded file field "file" in multipart form data' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB` },
          { status: 413 }
        );
      }

      fileName = file.name || fileName;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/json')) {
      const json = await request.json();
      if (!json || typeof json !== 'object') {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }

      if (!json.xml_content || typeof json.xml_content !== 'string') {
        return NextResponse.json({ error: 'Missing required field: xml_content' }, { status: 400 });
      }

      fileName = json.file_name ?? fileName;
      fileBuffer = Buffer.from(json.xml_content, 'utf-8');

      if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Payload exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB` },
          { status: 413 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Must be multipart/form-data or application/json' },
        { status: 400 }
      );
    }

    const service = createMspIngestionService(identity.accessToken);
    const result = await service.ingestMspXml({
      programmeId,
      fileName,
      fileBuffer,
      createdBy: identity.actorId,
    });

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 201 });
    }

    const statusCode =
      result.error.errorCode === 'MSP_DUPLICATE_IMPORT'
        ? 409
        : result.error.errorCode === 'PROGRAMME_NOT_FOUND'
        ? 404
        : 400;

    return NextResponse.json({ error: result.error.message, code: result.error.errorCode }, { status: statusCode });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to ingest MSP file';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
