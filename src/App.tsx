import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ImageStudio from "./pages/ImageStudio";
import MetadataStripper from "./pages/MetadataStripper";
import SubtitleTools from "./pages/SubtitleTools";
import Transcribe from "./pages/Transcribe";
import VideoStudio from "./pages/VideoStudio";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="images" element={<ImageStudio />} />
          <Route path="metadata" element={<MetadataStripper />} />
          <Route path="video" element={<VideoStudio />} />
          <Route path="subtitles" element={<SubtitleTools />} />
          <Route path="transcribe" element={<Transcribe />} />
          <Route
            path="*"
            element={
              <div className="max-w-xl">
                <h1 className="text-3xl font-bold">Page not found</h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  That tool doesn't exist (yet). Head back home and pick one that does.
                </p>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
