import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Transform data to match expected format (handle both old and new schema)
    const transformedCharacters = (data || []).map((char: any) => {
      // If profile is JSONB, extract fields
      if (char.profile && typeof char.profile === 'object') {
        return {
          id: char.id,
          name: char.name,
          base_prompt: char.profile.base_prompt || "cinematic, realistic character",
          personality: char.profile.personality || "realistic movie character",
          reference_image: char.reference_image,
          visual_details: char.profile.visual_details || null,
        };
      }
      // Otherwise return as-is (backward compatibility)
      return {
        id: char.id,
        name: char.name,
        base_prompt: char.base_prompt || "cinematic, realistic character",
        personality: char.personality || "realistic movie character",
        reference_image: char.reference_image,
        visual_details: char.visual_details || null,
      };
    });

    return NextResponse.json({
      success: true,
      characters: transformedCharacters,
    });
  } catch (error: any) {
    console.error("Error fetching characters:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch characters",
      },
      { status: 500 }
    );
  }
}

