
import { supabase } from "../config/supabase";

// Mengambil semua perangkat
export const getAllDevices = async () => {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

// Mengambil perangkat berdasarkan ID
export const getDeviceById = async (id: string) => {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

// Menambahkan perangkat
export const createDevice = async (
  nama: string,
  lokasi: string
) => {
  const { data, error } = await supabase
    .from("devices")
    .insert({
      nama,
      lokasi,
      status: "offline"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Mengubah perangkat
export const updateDevice = async (
  id: string,
  nama: string,
  lokasi: string
) => {
  const { data, error } = await supabase
    .from("devices")
    .update({ nama, lokasi })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Menghapus perangkat
export const deleteDevice = async (id: string) => {
  const { error } = await supabase
    .from("devices")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
};
