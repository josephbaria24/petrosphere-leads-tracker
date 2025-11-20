import Image from "next/image";

export function PDNIcon(props: React.ComponentProps<"img">) {
  return (
    <Image
      src="/PDN-ICON.png"
      alt="PDN Team Icon"
      width={24}
      height={24}
      className={props.className}
    />
  );
}
