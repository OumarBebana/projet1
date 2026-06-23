import sealImg from "./assets/mauritania_seal.jpg";

export default function MauritaniaLogo({ size = 50 }: { size?: number }) {
  return (
    <img
      src={sealImg}
      alt="Mauritania Emblem"
      width={size}
      height={size}
      style={{ borderRadius: "50%", objectFit: "cover" }}
    />
  );
}

