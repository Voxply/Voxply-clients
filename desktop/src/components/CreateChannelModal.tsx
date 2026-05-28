import React from "react";
import { useTranslation } from "react-i18next";
import { FocusTrap } from "./FocusTrap";

interface Props {
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  isCategory: boolean;
  onIsCategoryChange: (v: boolean) => void;
  parentId: string | null;
  onCreate: () => void;
  onClose: () => void;
}

export function CreateChannelModal({
  name, onNameChange, description, onDescriptionChange,
  isCategory, onIsCategoryChange, parentId, onCreate, onClose,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <FocusTrap>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          {isCategory ? t("channel.create.title_category") : t("channel.create.title_channel")}
          {parentId ? t("channel.create.inside_category") : ""}
        </h3>
        <div className="channel-type-row">
          <button
            type="button"
            className={`channel-type-btn ${!isCategory ? "selected" : ""}`}
            onClick={() => onIsCategoryChange(false)}
          >
            {t("channel.create.type_channel")}
          </button>
          <button
            type="button"
            className={`channel-type-btn ${isCategory ? "selected" : ""}`}
            onClick={() => onIsCategoryChange(true)}
          >
            {t("channel.create.type_category")}
          </button>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreate();
            if (e.key === "Escape") onClose();
          }}
          placeholder={isCategory ? t("channel.create.name_placeholder_category") : t("channel.create.name_placeholder_channel")}
          autoFocus
        />
        {!isCategory && (
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("channel.create.description_placeholder")}
            rows={3}
          />
        )}
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">{t("modal.cancel")}</button>
          <button onClick={onCreate}>{t("modal.create")}</button>
        </div>
      </div>
      </FocusTrap>
    </div>
  );
}
