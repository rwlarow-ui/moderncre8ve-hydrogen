import { createContext, useContext } from "react";

export type ImageAspectRatioType = "adapt" | "1/1" | "3/4" | "4/3" | "16/9";

interface ImageWithTextContextType {
  imageCount: number;
  setImageCount: (count: number) => void;
  imageAspectRatio: ImageAspectRatioType;
  setImageAspectRatio: (ratio: ImageAspectRatioType) => void;
}

export const ImageWithTextContext = createContext<ImageWithTextContextType>({
  imageCount: 0,
  setImageCount: () => {
    // default no-op until a provider supplies the setter
  },
  imageAspectRatio: "1/1",
  setImageAspectRatio: () => {
    // default no-op until a provider supplies the setter
  },
});

export const useImageWithTextContext = () => useContext(ImageWithTextContext);
