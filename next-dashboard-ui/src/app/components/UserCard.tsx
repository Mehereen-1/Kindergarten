import Image from "next/image";

type UserCardProps = {
  type: string;
  count?: number | null;
};

const formatCount = (count?: number | null) => {
  if (count === undefined) {
    return "1,234";
  }

  if (count === null) {
    return "--";
  }

  return new Intl.NumberFormat("en-US").format(count);
};

const UserCard = ({ type, count }: UserCardProps) => {
  return (
    <div className="rounded-2xl odd:bg-lamaPurple even:bg-lamaYellow p-4 flex-1 min-w-[130px]">
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
          2024/25
        </span>
        <Image src="/more.png" alt="" width={20} height={20} />
      </div>
      <h1 className="text-2xl font-semibold my-4">{formatCount(count)}</h1>
      <h2 className="capitalize text-sm font-medium text-gray-500">{type}s</h2>
    </div>
  );
};

export default UserCard;