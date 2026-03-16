import type { InspectInfo } from '@shared/types';

interface Props {
  info: InspectInfo;
}

function SpacingBox({ margin, padding, width, height }: Readonly<{
    margin: InspectInfo['margin'];
    padding: InspectInfo['padding'];
    width: number;
    height: number;
}>) {
  return (
    <div class="inspect-box">
      {/* Margin */}
      <div class="inspect-box__margin">
        <span class="inspect-box__val inspect-box__val--top">{margin.top}</span>
        <span class="inspect-box__val inspect-box__val--right">{margin.right}</span>
        <span class="inspect-box__val inspect-box__val--bottom">{margin.bottom}</span>
        <span class="inspect-box__val inspect-box__val--left">{margin.left}</span>
        {/* Padding */}
        <div class="inspect-box__padding">
          <span class="inspect-box__val inspect-box__val--top">{padding.top}</span>
          <span class="inspect-box__val inspect-box__val--right">{padding.right}</span>
          <span class="inspect-box__val inspect-box__val--bottom">{padding.bottom}</span>
          <span class="inspect-box__val inspect-box__val--left">{padding.left}</span>
          {/* Content */}
          <div class="inspect-box__content">
            {width} × {height}
          </div>
        </div>
      </div>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div class="inspect-prop">
      <span class="inspect-prop__label">{label}</span>
      <span class="inspect-prop__value">{value}</span>
    </div>
  );
}

export function InspectReportView({ info }: Props) {
  const selector = `${info.tag}${info.id ? '#' + info.id : ''}${info.classes.length ? '.' + info.classes.slice(0, 3).join('.') : ''}`;

  return (
    <div class="report">
      <div class="inspect-selector">{selector}</div>

      <SpacingBox
        margin={info.margin}
        padding={info.padding}
        width={info.width}
        height={info.height}
      />

      <div class="inspect-props">
        <PropRow label="Font" value={`${info.fontWeight} ${info.fontSize} ${info.fontFamily}`} />
        <PropRow label="Line Height" value={info.lineHeight} />
        <PropRow label="Color" value={info.color} />
        <PropRow label="Background" value={info.backgroundColor} />
        <PropRow label="Display" value={info.display} />
        <PropRow label="Position" value={info.position} />
      </div>
    </div>
  );
}
