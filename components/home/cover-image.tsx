import Image from "next/image";

type Props = {
  title: string;
  src: string;
};

const CoverImage = ({ title, src }: Props) => {
  return (
    <div className="sm:mx-0">
      <Image
        src={src}
        alt={`Cover Image for ${title}`}
        width={1300}
        height={630}
        priority={true}
      />
    </div>
  );
};

export default CoverImage;
