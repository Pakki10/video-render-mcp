import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import { TitleScene } from "./scenes/TitleScene";
import { CodeScene } from "./scenes/CodeScene";
import { StatScene } from "./scenes/StatScene";
import { CtaScene } from "./scenes/CtaScene";
import type { RemotionInputProps, Scene } from "../lib/scene-plan";

export function HyperplexedStyle(props: RemotionInputProps) {
  const { fps } = useVideoConfig();
  const { plan, narrationDataUrl, sceneRanges } = props;

  return (
    <AbsoluteFill style={{ background: "#0f172a" }}>
      {plan.scenes.map((scene, i) => {
        const range = sceneRanges[i];
        if (!range) return null;
        const from = Math.round(range.startSec * fps);
        const durationInFrames = Math.max(
          1,
          Math.round((range.endSec - range.startSec) * fps)
        );
        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            <SceneRouter scene={scene} plan={plan} />
          </Sequence>
        );
      })}
      <Audio src={narrationDataUrl} />
    </AbsoluteFill>
  );
}

function SceneRouter({
  scene,
  plan,
}: {
  scene: Scene;
  plan: RemotionInputProps["plan"];
}) {
  switch (scene.type) {
    case "title":
      return (
        <TitleScene
          copy={scene.copy}
          subtitle={scene.subtitle}
          accent={plan.accent}
        />
      );
    case "code":
      return (
        <CodeScene
          language={scene.language}
          snippet={scene.snippet}
          caption={scene.caption}
          highlightLines={scene.highlightLines}
          accent={plan.accent}
        />
      );
    case "stat":
      return <StatScene big={scene.big} small={scene.small} accent={plan.accent} />;
    case "cta":
      return <CtaScene url={scene.url} copy={scene.copy} accent={plan.accent} />;
  }
}
