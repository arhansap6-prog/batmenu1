import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  PowerOff,
  Play,
  Trash2,
  Film,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteIntroVideo,
  disableIntroVideo,
  listIntroVideos,
  reactivateIntroVideo,
  uploadAndActivateIntroVideo,
  type IntroVideoRecord,
} from "@/integrations/supabase/introVideo";

export const Route = createFileRoute("/_authenticated/admin/intro-video")({
  head: () => ({
    meta: [{ title: "Intro Video — Admin" }, { name: "robots", content: "noindex" }],
  }),
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: isSA } = await supabase.rpc("is_super_admin", {
      _user_id: userRes.user.id,
    });
    if (!isSA) throw redirect({ to: "/access-denied" });
  },
  component: AdminIntroVideo,
});

function AdminIntroVideo() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-intro-videos"],
    queryFn: listIntroVideos,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-intro-videos"] });
    qc.invalidateQueries({ queryKey: ["active-intro-video"] });
  };

  const uploadM = useMutation({
    mutationFn: (file: File) => uploadAndActivateIntroVideo(file),
    onSuccess: () => {
      toast.success("Intro video uploaded and activated");
      setPendingFile(null);
      if (fileInput.current) fileInput.current.value = "";
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const disableM = useMutation({
    mutationFn: () => disableIntroVideo(),
    onSuccess: () => {
      toast.success("Intro video disabled");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const reactivateM = useMutation({
    mutationFn: (id: string) => reactivateIntroVideo(id),
    onSuccess: () => {
      toast.success("Activated");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteM = useMutation({
    mutationFn: (r: IntroVideoRecord) => deleteIntroVideo(r),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const active = listQ.data?.find((v) => v.is_active) ?? null;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPendingFile(f);
  }

  function submitUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingFile) return;
    uploadM.mutate(pendingFile);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Super Admin
          </p>
          <h1 className="font-display text-3xl font-semibold">Intro Video</h1>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            active
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {active ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> ON
            </>
          ) : (
            <>
              <PowerOff className="h-3.5 w-3.5" /> OFF
            </>
          )}
        </span>
      </div>

      <form
        onSubmit={submitUpload}
        className="glass grid gap-4 rounded-2xl p-6"
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Upload new intro video
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The selected file replaces the currently active one. All visitors
            (including anonymous) will see it fullscreen once per session.
          </p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          onChange={onPick}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-card file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-accent"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!pendingFile || uploadM.isPending}
            className="inline-flex items-center gap-2 rounded-lg gradient-red px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {uploadM.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload & activate
          </button>
          <button
            type="button"
            onClick={() => disableM.mutate()}
            disabled={!active || disableM.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
          >
            {disableM.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PowerOff className="h-4 w-4" />
            )}
            Disable intro video
          </button>
        </div>
      </form>

      <section>
        <h2 className="mb-3 font-display text-lg">History</h2>
        {listQ.isLoading ? (
          <div className="grid min-h-[20vh] place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : listQ.isError ? (
          <div className="glass rounded-xl p-6 text-sm text-destructive">
            Failed to load.{" "}
            <button onClick={() => listQ.refetch()} className="underline">
              Retry
            </button>
          </div>
        ) : !listQ.data || listQ.data.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <Film className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg">No videos yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload your first intro video above.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-card">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {listQ.data.map((v) => (
                  <tr key={v.id} className="bg-background/40">
                    <td className="px-4 py-3 font-medium">
                      {v.storage_path.split("/").pop()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(v.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          v.is_active
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {v.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!v.is_active && (
                          <button
                            onClick={() => reactivateM.mutate(v.id)}
                            disabled={reactivateM.isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50"
                          >
                            <Play className="h-3 w-3" />
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "Delete this video permanently? This cannot be undone.",
                              )
                            )
                              deleteM.mutate(v);
                          }}
                          disabled={deleteM.isPending}
                          className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
