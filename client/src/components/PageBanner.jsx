export default function PageBanner({ kicker, title, desc, extra }) {
  return (
    <div className="nowa-page-banner">
      <div className="nowa-page-banner-left">
        {kicker ? <span className="nowa-page-banner-kicker">{kicker}</span> : null}
        <div className="nowa-page-banner-title">{title}</div>
        {desc ? <div className="nowa-page-banner-desc">{desc}</div> : null}
      </div>
      {extra ? <div className="nowa-page-banner-right">{extra}</div> : null}
    </div>
  )
}
