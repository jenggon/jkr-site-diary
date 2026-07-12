import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {

  const { data, error } =
    await supabase

      .from("msp_tasks")

      .select(`
        task_name,
        start_date,
        finish_date,
        revision_id
      `)

      .eq(
        "outline_number",
        "0"
      )

      .single();

  if (error) {

    return NextResponse.json(

      {
        error:
          error.message,
      },

      {
        status: 500,
      }

    );

  }

  return NextResponse.json(
    data
  );

}