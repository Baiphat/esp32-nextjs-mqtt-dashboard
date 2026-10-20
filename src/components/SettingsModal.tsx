"use client";

import { Settings } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  DEFAULT_CONFIG,
  validateConfig,
  type ConfigErrors,
  type Esp32Config,
} from "@/lib/config";

interface SettingsModalProps {
  open: boolean;
  config: Esp32Config;
  onClose: () => void;
  onSave: (config: Esp32Config) => void;
}

const FORM_ID = "settings-form";

export function SettingsModal({
  open,
  config,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [draft, setDraft] = useState(config);
  const [errors, setErrors] = useState<ConfigErrors>({});

  // เปิดทีไรให้เริ่มจากค่าปัจจุบัน ไม่ค้างค่าที่แก้ค้างไว้
  useEffect(() => {
    if (open) {
      setDraft(config);
      setErrors({});
    }
  }, [open, config]);

  const update = (key: keyof Esp32Config) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleaned: Esp32Config = {
      ...draft,
      brokerUrl: draft.brokerUrl.trim(),
      deviceId: draft.deviceId.trim(),
      username: draft.username.trim(),
    };
    const found = validateConfig(cleaned);
    setErrors(found);
    if (Object.keys(found).length === 0) onSave(cleaned);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ตั้งค่าการเชื่อมต่อ"
      description="ค่านี้ต้องตรงกับที่ตั้งไว้ในโค้ด Arduino"
      icon={<Settings aria-hidden className="size-5" />}
      footer={
        <>
          <Button variant="flat" onClick={() => setDraft(DEFAULT_CONFIG)}>
            คืนค่าเริ่มต้น
          </Button>
          <Button type="submit" form={FORM_ID}>
            บันทึก
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4"
      >
        <Field
          label="ที่อยู่ Broker (WebSocket)"
          required
          value={draft.brokerUrl}
          onChange={(e) => update("brokerUrl")(e.target.value)}
          placeholder="wss://broker.emqx.io:8084/mqtt"
          error={errors.brokerUrl}
          hint="หน้าเว็บที่เปิดผ่าน https ต้องใช้ wss:// เท่านั้น"
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
        />
        <Field
          label="ชื่ออุปกรณ์ (Device ID)"
          required
          value={draft.deviceId}
          onChange={(e) => update("deviceId")(e.target.value)}
          placeholder="my-esp32-home"
          error={errors.deviceId}
          hint={`ใช้เป็นหัวข้อ esp32/${draft.deviceId.trim() || "…"}/ ตั้งให้เดายากเพื่อความปลอดภัย`}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="ชื่อผู้ใช้"
            value={draft.username}
            onChange={(e) => update("username")(e.target.value)}
            placeholder="ไม่บังคับ"
            autoComplete="off"
          />
          <Field
            label="รหัสผ่าน"
            type="password"
            value={draft.password}
            onChange={(e) => update("password")(e.target.value)}
            placeholder="ไม่บังคับ"
            autoComplete="new-password"
          />
        </div>
        <p className="-mt-1 text-xs text-zinc-500">
          ค่าทั้งหมดเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น
        </p>
      </form>
    </Modal>
  );
}
