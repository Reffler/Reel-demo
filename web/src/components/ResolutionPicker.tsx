import { Show } from "solid-js";
import { RESOLUTIONS, outputSize, resolution, setResolution } from "../resolution";
import { Segmented } from "../ui/kit";

// Where the export's resolution is picked: 720p, 1080p, 2K or 4K, with the pixel size it gives.
export function ResolutionPicker(props: { width?: number; height?: number }) {
  return (
    <div class="resolution-picker">
      <span class="resolution-label">Resolution</span>
      <Segmented label="Resolution" value={resolution()} options={RESOLUTIONS.map(r => ({ value: r.value, label: r.label }))} onChange={setResolution} />
      <Show when={props.width && props.height}>
        <span class="resolution-size">{outputSize(props.width!, props.height!, resolution())}{resolution() === "2160p" || resolution() === "1440p" ? " · takes longer" : ""}</span>
      </Show>
    </div>
  );
}
