"use client"

import { useRef, useState, useTransition } from "react"
import { Camera, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { updateProfile } from "@/app/dashboard/perfil/actions"
import { Avatar } from "@/components/avatar"

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export function ProfileForm({
  userId,
  email,
  initialName,
  initialAvatar,
}: {
  userId: string
  email: string
  initialName: string | null
  initialAvatar: string | null
}) {
  const [name, setName] = useState(initialName ?? "")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isSaving, startSave] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith("image/")) {
      setError("Elige un archivo de imagen.")
      return
    }
    if (f.size > MAX_BYTES) {
      setError("La imagen no puede superar 2 MB.")
      return
    }
    setError(null)
    setSaved(false)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleSave() {
    if (!name.trim()) {
      setError("El nombre no puede estar vacío.")
      return
    }
    setError(null)
    setSaved(false)
    startSave(async () => {
      try {
        let url = avatarUrl
        if (file) {
          const supabase = createClient()
          const path = `${userId}/avatar`
          const { error: upErr } = await supabase.storage
            .from("avatars")
            .upload(path, file, { upsert: true, contentType: file.type })
          if (upErr) throw new Error(upErr.message)
          const { data } = supabase.storage.from("avatars").getPublicUrl(path)
          url = `${data.publicUrl}?t=${Date.now()}` // cache-busting
        }
        await updateProfile({ displayName: name.trim(), avatarUrl: url })
        setAvatarUrl(url)
        setFile(null)
        setPreview(null)
        setSaved(true)
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  const shown = preview ?? avatarUrl

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      {/* Avatar + cambiar foto */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative cursor-pointer rounded-full"
          title="Cambiar foto"
        >
          <Avatar src={shown} name={name || email} size={72} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
            <Camera size={20} className="text-white" />
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Foto de perfil</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-1 cursor-pointer text-xs text-emerald-300 transition hover:text-emerald-200"
          >
            Subir una imagen
          </button>
          <p className="mt-0.5 text-[11px] text-white/35">JPG o PNG, máx. 2 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={pickFile}
        />
      </div>

      {/* Nombre */}
      <label className="mt-6 block text-xs font-medium uppercase tracking-wider text-white/40">
        Nombre de usuario
      </label>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setSaved(false)
        }}
        maxLength={40}
        placeholder="¿Cómo te ven los demás?"
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/50"
      />

      <p className="mt-3 text-xs text-white/35">Cuenta: {email}</p>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-semibold text-emerald-950 transition hover:opacity-90 disabled:opacity-50"
      >
        {isSaving ? (
          "Guardando…"
        ) : saved ? (
          <>
            <Check size={16} /> Guardado
          </>
        ) : (
          "Guardar cambios"
        )}
      </button>
    </div>
  )
}
