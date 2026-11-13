
import { supabase } from "../config/supabase.js";

export const getAllContents = async () => {
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const getContentById = async (id: string) => {
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const createContent = async (
  judul: string,
  tipe: string,
  payload: string
) => {
  const { data, error } = await supabase
    .from("contents")
    .insert([{ judul, tipe, payload }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateContent = async (
  id: string,
  judul: string,
  tipe: string,
  payload: string
) => {
  const { data, error } = await supabase
    .from("contents")
    .update({ judul, tipe, payload })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteContent = async (id: string) => {
  const { error } = await supabase
    .from("contents")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
