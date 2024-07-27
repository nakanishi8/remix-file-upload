import React, { createContext, useContext, useState, ReactNode } from "react";

interface UploadContextType {
  uploadFilename: string | null;
  setUploadFilename: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);

  return (
    <UploadContext.Provider value={{ uploadFilename, setUploadFilename }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
};
