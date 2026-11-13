
import DeviceClient from "./device-client";

export const instant = false;

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DevicePage({ params }: Props) {
  const { id } = await params;

  return <DeviceClient deviceId={id} />;
}
