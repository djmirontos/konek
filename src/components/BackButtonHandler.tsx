"use client";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";

export default function BackButtonHandler() {
  useAndroidBackButton();
  return null;
}
