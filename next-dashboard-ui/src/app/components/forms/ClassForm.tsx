"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import InputField from "../InputField";

const schema = z.object({
  classId: z.string().min(1, { message: "Class ID is required!" }),
  name: z.string().min(1, { message: "Class name is required!" }),
  grade: z.string().min(1, { message: "Grade is required!" }),
  capacity: z.coerce.number().min(0, { message: "Capacity must be 0 or more!" }),
});

type FormValues = z.input<typeof schema>;
type Inputs = z.output<typeof schema>;

type ClassFormProps = {
  type: "create" | "update";
  data?: {
    _id?: string;
    classId?: string;
    name?: string;
    grade?: string;
    capacity?: number;
  };
};

const ClassForm = ({ type, data }: ClassFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues, any, Inputs>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (formData) => {
    const payload = {
      ...formData,
      capacity: Number(formData.capacity),
    };

    const response = await fetch("/api/admin/classes", {
      method: type === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(type === "update" ? { id: data?._id } : {}),
        ...payload,
      }),
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    const error = await response.json().catch(() => ({}));
    alert(error.error || "Failed to save class");
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new class" : "Update class"}
      </h1>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Class ID"
          name="classId"
          defaultValue={data?.classId}
          register={register}
          error={errors.classId}
        />
        <InputField
          label="Class Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Grade"
          name="grade"
          defaultValue={data?.grade}
          register={register}
          error={errors.grade}
        />
        <InputField
          label="Capacity"
          name="capacity"
          type="number"
          defaultValue={data?.capacity?.toString()}
          register={register}
          error={errors.capacity as any}
          inputProps={{ min: 0 }}
        />
      </div>
      <button className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default ClassForm;
