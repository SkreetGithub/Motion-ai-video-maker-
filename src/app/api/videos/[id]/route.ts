import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Await params in Next.js 15
    const { id } = await params;
    
    // Check if ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid video ID format. Expected UUID." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      // If not found, try to find by title or other identifier
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Video not found" },
          { status: 404 }
        );
      }
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      video: data,
    });
  } catch (error: any) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch video",
      },
      { status: 500 }
    );
  }
}

