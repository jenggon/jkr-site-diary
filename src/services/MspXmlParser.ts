import { XMLParser } from 'fast-xml-parser';
import { MspXmlParseError } from '@/errors/mspErrors';

export interface ParsedMspTask {
  readonly taskUid: number;
  readonly taskName: string;
  readonly wbs: string | null;
  readonly outlineNumber: string | null;
  readonly outlineLevel: number;
  readonly plannedStart: string | null;
  readonly plannedFinish: string | null;
  readonly plannedDurationDays: number | null;
  readonly isMilestone: boolean;
  readonly isSummary: boolean;
}

export interface ParsedMspProject {
  readonly projectName: string;
  readonly tasks: readonly ParsedMspTask[];
}

export class MspXmlParser {
  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      processEntities: false, // Security: Disable entity expansion / XXE
      trimValues: true,
    });
  }

  public parseXml(xmlContent: string): ParsedMspProject {
    if (!xmlContent || xmlContent.trim() === '') {
      throw new MspXmlParseError('MSP XML content is empty');
    }

    let parsedData: Record<string, unknown>;
    try {
      parsedData = this.parser.parse(xmlContent) as Record<string, unknown>;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid XML format';
      throw new MspXmlParseError(`Failed to parse XML: ${msg}`, { cause: err });
    }

    if (!parsedData || !parsedData.Project || typeof parsedData.Project !== 'object') {
      throw new MspXmlParseError('Missing required <Project> root element in MSP XML');
    }

    const project = parsedData.Project as Record<string, unknown>;
    const projectName = String(project.Title ?? project.Name ?? 'MSP Project');

    const tasksObj = project.Tasks as Record<string, unknown> | undefined;
    if (!tasksObj || !tasksObj.Task) {
      throw new MspXmlParseError('Missing required <Tasks> or <Task> elements in MSP XML');
    }

    const rawTasks = tasksObj.Task;
    const taskList = (Array.isArray(rawTasks) ? rawTasks : [rawTasks]) as Array<Record<string, unknown>>;

    const seenTaskUids = new Set<number>();
    const tasks: ParsedMspTask[] = [];

    for (const rawTask of taskList) {
      if (rawTask == null || typeof rawTask !== 'object') continue;

      const rawUid = rawTask.UID;
      if (rawUid === undefined || rawUid === null || rawUid === '') {
        continue; // Skip tasks without UID if any
      }

      const taskUid = parseInt(String(rawUid), 10);
      if (isNaN(taskUid)) {
        throw new MspXmlParseError(`Invalid Task UID '${rawUid}' in MSP XML`);
      }

      if (seenTaskUids.has(taskUid)) {
        throw new MspXmlParseError(`Duplicate Task.UID '${taskUid}' detected in MSP XML file`);
      }
      seenTaskUids.add(taskUid);

      const taskName = String(rawTask.Name ?? '').trim();
      const wbs = rawTask.WBS != null ? String(rawTask.WBS).trim() : null;
      const outlineNumber = rawTask.OutlineNumber != null ? String(rawTask.OutlineNumber).trim() : null;
      const outlineLevel = rawTask.OutlineLevel != null ? parseInt(String(rawTask.OutlineLevel), 10) : 1;

      const plannedStart = this.parseIsoDate(rawTask.Start);
      const plannedFinish = this.parseIsoDate(rawTask.Finish);
      const plannedDurationDays = this.parseDurationDays(rawTask.Duration);

      const isMilestone = rawTask.Milestone === 1 || rawTask.Milestone === '1' || rawTask.Milestone === true;
      const isSummary = rawTask.Summary === 1 || rawTask.Summary === '1' || rawTask.Summary === true;

      tasks.push({
        taskUid,
        taskName,
        wbs: wbs !== '' ? wbs : null,
        outlineNumber: outlineNumber !== '' ? outlineNumber : null,
        outlineLevel: isNaN(outlineLevel) ? 1 : outlineLevel,
        plannedStart,
        plannedFinish,
        plannedDurationDays,
        isMilestone,
        isSummary,
      });
    }

    return {
      projectName,
      tasks,
    };
  }

  private parseIsoDate(val: unknown): string | null {
    if (val == null || typeof val !== 'string' || val.trim() === '') return null;
    const str = val.trim();
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  private parseDurationDays(val: unknown): number | null {
    if (val == null) return null;
    if (typeof val === 'number') return val > 0 ? val : null;
    if (typeof val !== 'string') return null;

    const str = val.trim();
    if (str === '') return null;

    // ISO 8601 duration format, e.g. PT80H0M0S or PT8H0M0S
    const isoMatch = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
    if (isoMatch) {
      const hours = parseInt(isoMatch[1] ?? '0', 10);
      const minutes = parseInt(isoMatch[2] ?? '0', 10);
      const totalHours = hours + minutes / 60;
      return totalHours > 0 ? totalHours / 8 : null; // 8 hours per work day
    }

    const num = parseFloat(str);
    return !isNaN(num) && num > 0 ? num : null;
  }
}
