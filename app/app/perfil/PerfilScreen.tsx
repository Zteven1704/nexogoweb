"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { useAuthSession } from "@/components/auth/useAuthSession";
import {
  formatProfileError,
  getOwnProfile,
  legacyRoleLabel,
  profilePhotoRejection,
  saveOwnProfile,
  uploadOwnProfilePhoto,
  type UserProfile,
} from "@/lib/profile";

const cardClass =
  "rounded-2xl border border-line bg-white p-5 shadow-[0_16px_40px_-32px_rgba(10,35,66,0.65)] sm:p-6";

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm text-nexo-deep outline-none placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const primaryButtonClass =
  "inline-flex h-11 items-center justify-center rounded-full bg-nexo-deep px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16345c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue disabled:cursor-not-allowed disabled:opacity-60";

const photoButtonClass =
  "mt-3 inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-nexo-deep transition hover:bg-slate-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nexo-blue";

type ProfileLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "missing" }
  | { status: "ready"; profile: UserProfile };

type Draft = {
  nombre: string;
  telefono: string;
  whatsapp: string;
};

const emptyDraft: Draft = { nombre: "", telefono: "", whatsapp: "" };

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

function draftFromProfile(profile: UserProfile): Draft {
  return {
    nombre: profile.nombre,
    telefono: profile.telefono,
    whatsapp: profile.whatsapp,
  };
}

function sameDraft(left: Draft, right: Draft): boolean {
  return (
    left.nombre.trim() === right.nombre.trim() &&
    left.telefono.trim() === right.telefono.trim() &&
    left.whatsapp.trim() === right.whatsapp.trim()
  );
}

export function PerfilScreen() {
  const session = useAuthSession();
  const [load, setLoad] = useState<ProfileLoad>({ status: "loading" });
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [baseline, setBaseline] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoNotice, setPhotoNotice] = useState("");
  const [photoError, setPhotoError] = useState("");
  const savingRef = useRef(false);
  const photoPreviewRef = useRef("");

  useEffect(() => {
    return () => {
      if (photoPreviewRef.current) {
        URL.revokeObjectURL(photoPreviewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    const userId = session.user.uid;
    let cancelled = false;

    getOwnProfile(userId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.status === "missing") {
          setLoad({ status: "missing" });
          setDraft(emptyDraft);
          setBaseline(emptyDraft);
          return;
        }

        const nextDraft = draftFromProfile(result.profile);
        setLoad({ status: "ready", profile: result.profile });
        setDraft(nextDraft);
        setBaseline(nextDraft);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoad({
            status: "error",
            message: formatProfileError(error, "No se pudo cargar el perfil."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session.status === "loading" || (session.status === "authenticated" && load.status === "loading")) {
    return (
      <p className="text-sm font-medium text-muted" role="status">
        Cargando perfil
      </p>
    );
  }

  if (session.status !== "authenticated") {
    return <p className="text-sm leading-6 text-muted">No hay una sesión activa.</p>;
  }

  if (load.status === "error") {
    return (
      <section className="mx-auto max-w-3xl">
        <BackLink />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-nexo-deep sm:text-4xl">Perfil</h1>
        <p role="alert" className="mt-4 text-sm leading-6 text-red-700">
          {load.message}
        </p>
      </section>
    );
  }

  const email = session.user.email?.trim() || (load.status === "ready" ? load.profile.correo : "");
  const profile = load.status === "ready" ? load.profile : null;
  const dirty = !sameDraft(draft, baseline);
  const photoUrl = photoPreview || profile?.profileImageUrl || "";

  function replacePhotoPreview(nextUrl: string) {
    if (photoPreviewRef.current) {
      URL.revokeObjectURL(photoPreviewRef.current);
    }
    photoPreviewRef.current = nextUrl;
    setPhotoPreview(nextUrl);
  }

  async function onPhotoSelected(file: File) {
    if (session.status !== "authenticated" || photoUploading) {
      return;
    }

    const rejection = profilePhotoRejection(file);
    setPhotoNotice("");
    setPhotoError("");
    if (rejection) {
      setPhotoError(rejection);
      return;
    }

    replacePhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);

    try {
      const saved = await uploadOwnProfilePhoto(session.user.uid, file);
      replacePhotoPreview("");
      setLoad({ status: "ready", profile: saved });
      setPhotoNotice("Foto actualizada.");
    } catch (error) {
      replacePhotoPreview("");
      setPhotoError(formatProfileError(error, "No se pudo guardar la foto."));
    } finally {
      setPhotoUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current || session.status !== "authenticated" || !dirty) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setNotice("");
    setFormError("");

    try {
      const saved = await saveOwnProfile({
        uid: session.user.uid,
        authEmail: session.user.email?.trim() ?? "",
        nombre: draft.nombre,
        telefono: draft.telefono,
        whatsapp: draft.whatsapp,
      });
      const nextDraft = draftFromProfile(saved);
      setLoad({ status: "ready", profile: saved });
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setNotice("Perfil actualizado.");
    } catch (error) {
      setFormError(formatProfileError(error, "No se pudo guardar el perfil."));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <BackLink />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-nexo-deep sm:text-4xl">Perfil</h1>
      <p className="mt-4 text-base leading-7 text-muted">Datos de la cuenta</p>

      {load.status === "missing" ? (
        <p className="mt-4 text-sm leading-6 text-muted">Todavía no hay un perfil guardado para esta cuenta.</p>
      ) : null}

      <article className={`${cardClass} mt-8`}>
        <div className="flex items-center gap-4">
          <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-50 text-nexo-blue">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- profileImageUrl is a remote Firebase URL or a local preview
              <img src={photoUrl} alt="Foto de perfil" className="size-full object-cover" />
            ) : (
              <Icon name="user" className="size-8" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-nexo-deep">Foto</h2>
            <p className="mt-1 text-sm leading-6 text-muted">JPEG, PNG o WebP, de menos de 10 MB.</p>
            <label className={`${photoButtonClass} ${photoUploading ? "pointer-events-none opacity-60" : ""}`}>
              {photoUploading ? "Guardando foto" : "Cambiar foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={photoUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) {
                    void onPhotoSelected(file);
                  }
                }}
              />
            </label>
            {photoUploading ? (
              <p className="mt-2 text-sm text-muted" role="status">
                Guardando foto
              </p>
            ) : null}
            {photoNotice ? <p className="mt-2 text-sm font-medium text-nexo-cyan">{photoNotice}</p> : null}
            {photoError ? (
              <p role="alert" className="mt-2 text-sm leading-6 text-red-700">
                {photoError}
              </p>
            ) : null}
          </div>
        </div>
      </article>

      <article className={`${cardClass} mt-4`}>
        <h2 className="text-lg font-semibold text-nexo-deep">Información de cuenta</h2>
        <dl className="mt-4 border-t border-line">
          {email ? <Fact label="Email" value={email} /> : null}
          {profile?.rol ? <Fact label="Rol" value={legacyRoleLabel(profile.rol)} /> : null}
          {profile?.fechaRegistro ? (
            <Fact label="Fecha de registro" value={dateFormat.format(profile.fechaRegistro)} />
          ) : null}
          {profile && profile.isActive !== null ? (
            <Fact label="Estado" value={profile.isActive ? "Activo" : "Inactivo"} />
          ) : null}
        </dl>
      </article>

      <form className={`${cardClass} mt-4`} onSubmit={(event) => void onSubmit(event)}>
        <h2 className="text-lg font-semibold text-nexo-deep">Información editable</h2>
        <div className="mt-4 grid gap-4 border-t border-line pt-4">
          <label className="grid gap-2 text-sm font-medium text-nexo-deep">
            Nombre
            <input
              className={fieldClass}
              value={draft.nombre}
              onChange={(event) => setDraft((current) => ({ ...current, nombre: event.target.value }))}
              autoComplete="name"
              disabled={saving}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-nexo-deep">
            Teléfono
            <input
              className={fieldClass}
              value={draft.telefono}
              onChange={(event) => setDraft((current) => ({ ...current, telefono: event.target.value }))}
              autoComplete="tel"
              disabled={saving}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-nexo-deep">
            WhatsApp
            <input
              className={fieldClass}
              value={draft.whatsapp}
              onChange={(event) => setDraft((current) => ({ ...current, whatsapp: event.target.value }))}
              autoComplete="tel"
              disabled={saving}
            />
          </label>
        </div>
        {notice ? <p className="mt-4 text-sm font-medium text-nexo-cyan">{notice}</p> : null}
        {formError ? (
          <p role="alert" className="mt-4 text-sm leading-6 text-red-700">
            {formError}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end">
          <button type="submit" className={primaryButtonClass} disabled={saving || !dirty}>
            {saving ? "Guardando" : "Guardar"}
          </button>
        </div>
      </form>
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/app/configuracion"
      className="text-sm font-semibold text-nexo-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexo-blue"
    >
      Volver a configuración
    </Link>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-sm font-medium text-nexo-deep">{label}</dt>
      <dd className="text-sm text-muted sm:text-right">{value}</dd>
    </div>
  );
}
