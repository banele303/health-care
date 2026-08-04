import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomInput } from "@/components/global/CustomInput";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { CONVEX_SITE_URL } from "@/lib/convex";
import { UploadCloud } from "lucide-react";

const XRayUploadModal = ({ patientId }: { patientId: string }) => {
  const [imageUrl, setImageUrl] = useState("");
  const [storageId, setStorageId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const form = useForm({ defaultValues: { bodyPart: "", notes: "" } });

  const createLab = useMutation(api.labResults.create);
  const deleteFile = useMutation(api.files.deleteFile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      return toast.error("Max file size is 4MB");
    }
    try {
      setUploading(true);
      const url = await generateUploadUrl.mutateAsync({});
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId: sid } = await res.json();
      setStorageId(sid);
      // Store the proxied URL (raw Convex storage URLs return multipart and can't render in <img>)
      setImageUrl(`${CONVEX_SITE_URL}/image/${sid}`);
      toast.success("Image Uploaded successful");
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (formData: any) => {
    if (!imageUrl) return toast.error("Please upload an image first");
    try {
      await createLab.mutateAsync({
        patientId,
        testType: "X-Ray",
        bodyPart: formData.bodyPart,
        imageUrl,
        storageId,
        aiAnalysis: "Processing...",
      });
      toast.success("X-Ray recorded successfully");
      setOpen(false);
      form.reset();
      setImageUrl("");
      setStorageId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to record X-Ray");
    }
  };

  const removeFile = async () => {
    try {
      await deleteFile.mutateAsync({ storageId });
      toast.success("File deleted successfully!");
      setImageUrl("");
      setStorageId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete file");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
      <DialogTrigger asChild>
        <Button variant="outline">Upload X-Ray</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg card">
        <DialogHeader>
          <DialogTitle>Upload New X-Ray</DialogTitle>
        </DialogHeader>
        {!imageUrl ? (
          <label className="border-dashed border-2 border-slate-300 dark:border-slate-500 rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <UploadCloud className="h-10 w-10 text-blue-500" />
            <span className="text-sm text-slate-500 font-medium">
              {uploading
                ? "Uploading..."
                : "Click to upload X-Ray image (max 4MB)"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
              disabled={uploading}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt="Preview"
                className="h-full w-full object-contain"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                type="button"
                onClick={() => removeFile()}
                disabled={deleteFile.isPending}
              >
                Remove
              </Button>
            </div>

            <form
              onSubmit={form.handleSubmit(handleSave)}
              className="space-y-3"
            >
              <CustomInput
                control={form.control}
                name="bodyPart"
                label="Body Part"
                placeholder="e.g. Left Knee"
                disabled={createLab.isPending}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={createLab.isPending}
              >
                Save to Patient Record
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default XRayUploadModal;
