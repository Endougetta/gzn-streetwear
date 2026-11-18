import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { assetUrl, cardViews, categories, isLine, isReviewPreview, lineKey, maxLines, maxQuantity, photo, productById, products, sizes } from './catalog'
import type { Line, Product } from './catalog'
import './style.css'

const supportUrl = import.meta.env.VITE_SUPPORT_URL
const cartKey = 'gzn-selection-v1'

function restoreCart(): Line[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(cartKey) ?? '[]')
    return Array.isArray(saved) ? [...new Map(saved.filter(isLine).map(line => [lineKey(line), line])).values()].slice(0, maxLines) : []
  } catch {
    return []
  }
}

function Photo({ product, view, alt, eager = false, sizes: displaySizes = '(min-width: 850px) 33vw, 50vw' }:
{ product: Product; view: string; alt: string; eager?: boolean; sizes?: string }) {
  return <img src={photo(product, view)} srcSet={isReviewPreview ? undefined : photo(product, view, 480) + ' 480w, ' + photo(product, view) + ' 1120w'} sizes={displaySizes} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
}

function Home() {
  return <>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">GZN FIRST DROP</p>
        <h1 id="hero-title">GROUND<br />ZERO.<br />NOW?!</h1>
        <p className="intro">The first drop starts here.</p>
        <div className="hero-actions">
          <a className="button" href="#hoodies">Zu den Hoodies <span aria-hidden="true">↓</span></a>
          {supportUrl && <a className="button button-outline" href={supportUrl} target="_blank" rel="noopener noreferrer">Support GZN ↗</a>}
        </div>
      </div>
      <div className="hero-visual">
        <img
          src={assetUrl('/campaign/first-drop.jpg')}
          width={1536}
          height={1024}
          alt="Imad in drei Posen mit weißen Sneakern: im weißen Monogram-Shirt mit schwarzer Hose, im bordeauxfarbenen Not That Deep Set und im blauen Keep Building Set mit sichtbarem Rückenprint."
          fetchPriority="high"
        />
      </div>
    </section>
    {categories.map(category => <section key={category.id} className="collection" id={category.id}>
      <div className="collection-heading"><h2>{category.label}</h2></div>
      <div className="products">{products.filter(product => product.category === category.id).map(product => {
        const { front, back } = cardViews(product)
        return <Link key={product.id} to={'/produkt/' + product.id} className="card">
          <div className="card-image">
            <div className="card-photos">
              <Photo product={product} view={front} alt="" />
              {back && <div className="card-back"><Photo product={product} view={back} alt="" /></div>}
            </div>
            <span className="card-arrow" aria-hidden="true">↗</span>
          </div>
          <div className="product-meta"><h3>{product.name}</h3><span>{product.color}</span></div>
        </Link>
      })}</div>
    </section>)}
  </>
}

function ProductPage({ add }: { add: (line: Line) => boolean }) {
  const { id } = useParams()
  const product = productById.get(id ?? '')
  return product ? <ProductDetail key={product.id} product={product} add={add} /> : <NotFound />
}

function ProductDetail({ product, add }: { product: Product; add: (line: Line) => boolean }) {
  const [size, setSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState(0)
  const [error, setError] = useState('')
  const view = product.images[selected]
  const move = (offset: number) => setSelected(index => (index + offset + product.images.length) % product.images.length)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!add({ productId: product.id, size, quantity })) setError('Deine Auswahl hat das Mengenlimit erreicht.')
    else setError('')
  }

  return <div className="detail-wrap">
    <Link className="back-link" to={'/#' + product.category}>← Zur Kollektion</Link>
    <div className="detail">
      <section aria-label="Produktgalerie" className="gallery" onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault()
          move(['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1)
        }
      }}>
        <div className="gallery-stage">
          <Photo product={product} view={view.id} alt={product.name + ' · ' + view.label} eager sizes="(min-width: 850px) 54vw, 94vw" />
          <div className="gallery-controls">
            <button type="button" aria-label="Vorheriges Bild" onClick={() => move(-1)}>←</button>
            <span aria-live="polite">{selected + 1} / {product.images.length}</span>
            <button type="button" aria-label="Nächstes Bild" onClick={() => move(1)}>→</button>
          </div>
        </div>
        <div className="thumbnails">{product.images.map((image, index) => <button type="button" key={image.id} aria-label={image.label} aria-pressed={index === selected} onClick={() => setSelected(index)}>
          <Photo product={product} view={image.id} alt="" sizes="80px" />
        </button>)}</div>
      </section>
      <form className="product-form" onSubmit={submit}>
        <p className="eyebrow">{categories.find(category => category.id === product.category)?.label}</p>
        <h1>{product.name}</h1>
        <p>Farbe <strong>{product.color}</strong></p>
        <fieldset><legend>Größe</legend><div className="sizes">
          {sizes.map(option => <label key={option}>
            <input type="radio" name="size" value={option} checked={option === size} onChange={() => setSize(option)} required />
            <span>{option}</span>
          </label>)}
        </div></fieldset>
        <label className="quantity-label">Anzahl<select value={quantity} onChange={event => setQuantity(Number(event.target.value))}>
          {Array.from({ length: maxQuantity }, (_, index) => <option key={index}>{index + 1}</option>)}
        </select></label>
        <button className="button full">Zur Auswahl hinzufügen</button>
        {error && <p role="alert">{error}</p>}
        <p className="muted">Du kannst mehrere Pieces sammeln und deine Auswahl unverbindlich vormerken.</p>
      </form>
    </div>
  </div>
}

function Cart({ lines, update, dialog }: { lines: Line[]; update: (line: Line) => void; dialog: React.RefObject<HTMLDialogElement | null> }) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'selection' | 'submit' | 'done'>('selection')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const review = useRef<HTMLInputElement>(null)
  const attempt = useRef({ signature: '', key: '' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !lines.length) return
    if (isReviewPreview) {
      lines.forEach(line => update({ ...line, quantity: 0 }))
      setPhase('done')
      setEmail('')
      return
    }
    setPending(true)
    setMessage('')
    const signature = JSON.stringify([email.trim().toLowerCase(), lines])
    if (attempt.current.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() }
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, items: lines, requestId: attempt.current.key, company: new FormData(event.currentTarget).get('company') }),
      })
      const payload = await response.json() as { message?: string }
      if (!response.ok) {
        setMessage(payload.message ?? 'Die Vormerkung konnte gerade nicht abgeschlossen werden.')
        return
      }
      lines.forEach(line => update({ ...line, quantity: 0 }))
      setPhase('done')
      setEmail('')
      attempt.current = { signature: '', key: '' }
    } catch {
      setMessage('Die Verbindung ist gerade unterbrochen. Versuche es erneut.')
    } finally {
      setPending(false)
    }
  }

  return <dialog ref={dialog} className="drawer" aria-labelledby="cart-title" onClose={() => { if (!pending) { setPhase('selection'); setMessage('') } }}
    onCancel={event => { if (pending) event.preventDefault() }}>
    <header><h2 id="cart-title">Deine Auswahl</h2><button type="button" aria-label="Auswahl schließen" onClick={() => dialog.current?.close()} disabled={pending}>×</button></header>
    {phase === 'done' ? <div className="drawer-content" role="status"><h3>{isReviewPreview ? 'Testvormerkung abgeschlossen' : 'Schau in dein Postfach.'}</h3><p>{isReviewPreview ? 'In dieser Vorschau werden keine Daten gesendet.' : 'Bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben.'}</p><button className="button full" onClick={() => dialog.current?.close()}>Weiterstöbern</button></div>
      : <div className="drawer-content">
        {lines.length ? <ul className="cart-lines">{lines.map(line => {
          const product = productById.get(line.productId)!
          return <li key={lineKey(line)}>
            <Photo product={product} view={cardViews(product).front} alt="" sizes="75px" />
            <div><strong>{product.name}</strong><p>{product.color} · {line.size}</p>
              <label>Anzahl <select value={line.quantity} disabled={pending} onChange={event => update({ ...line, quantity: Number(event.target.value) })}>
                {Array.from({ length: maxQuantity }, (_, index) => <option key={index}>{index + 1}</option>)}
              </select></label>
              <button type="button" className="text-button" disabled={pending} onClick={() => update({ ...line, quantity: 0 })}>Entfernen</button>
            </div>
          </li>
        })}</ul> : <p>Deine Auswahl ist noch leer.</p>}
        {lines.length > 0 && phase === 'selection' && <button className="button full" onClick={() => { setPhase('submit'); requestAnimationFrame(() => review.current?.focus()) }}>Zur Vormerkung</button>}
        {lines.length > 0 && phase === 'submit' && <form className="checkout" onSubmit={submit}>
          <h3>Unverbindlich vormerken</h3>
          <p>Wir melden uns persönlich, wenn wir deine Auswahl anbieten können.</p>
          {import.meta.env.VITE_PRIVACY_URL && <a href={import.meta.env.VITE_PRIVACY_URL}>Datenschutzhinweise zur Vormerkung</a>}
          <label>E-Mail-Adresse<input ref={review} type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} disabled={pending} /></label>
          <div className="trap" aria-hidden="true"><label>Unternehmen<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
          <button className="button full" disabled={pending}>{pending ? 'Wird gesendet …' : 'Vormerkung absenden'}</button>
          {message && <p role="alert">{message}</p>}
        </form>}
      </div>}
  </dialog>
}

function Confirm() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '')
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  async function confirm() {
    setPending(true)
    try {
      const response = await fetch('/api/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
      const data = await response.json() as { message?: string }
      setConfirmed(response.ok)
      setStatus(data.message ?? 'Die Vormerkung konnte gerade nicht bestätigt werden.')
    } catch {
      setStatus('Die Verbindung ist gerade unterbrochen. Versuche es erneut.')
    } finally {
      setPending(false)
    }
  }
  return <section className="plain"><h1>Vormerkung bestätigen</h1>
    {token && !confirmed ? <button className="button" onClick={confirm} disabled={pending}>E-Mail-Adresse bestätigen</button> : null}
    <p role="status">{status || (!token ? 'Dieser Bestätigungslink ist unvollständig.' : '')}</p>
    <Link to="/">Zur Kollektion ↗</Link>
  </section>
}

function NotFound() {
  return <section className="plain"><h1>Seite nicht gefunden</h1><Link to="/">Zur Kollektion ↗</Link></section>
}

function App() {
  const [lines, setLines] = useState(restoreCart)
  const cart = useRef<HTMLDialogElement>(null)
  const main = useRef<HTMLElement>(null)
  const location = useLocation()
  const count = lines.reduce((total, line) => total + line.quantity, 0)
  useEffect(() => { try { localStorage.setItem(cartKey, JSON.stringify(lines)) } catch { /* Storage may be disabled. */ } }, [lines])
  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
      main.current?.focus({ preventScroll: true })
    }
  }, [location.pathname, location.hash])

  function update(line: Line) {
    setLines(previous => {
      const key = lineKey(line)
      if (line.quantity === 0) return previous.filter(item => lineKey(item) !== key)
      if (previous.some(item => lineKey(item) === key)) return previous.map(item => lineKey(item) === key ? line : item)
      return [...previous, line]
    })
  }

  function add(line: Line) {
    const previous = lines.find(item => lineKey(item) === lineKey(line))
    const combined = { ...line, quantity: (previous?.quantity ?? 0) + line.quantity }
    if (!isLine(combined) || (!previous && lines.length >= maxLines)) return false
    update(combined)
    cart.current?.showModal()
    return true
  }

  return <>
    <a className="skip" href="#main">Zum Inhalt</a>
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label="GZN Startseite">GZN<span>.</span></Link>
      <nav aria-label="Hauptnavigation"><Link to="/#hoodies">Kollektion</Link></nav>
      <button className="bag" type="button" onClick={() => cart.current?.showModal()}>Auswahl <span>{count}</span></button>
    </header>
    <main id="main" ref={main} tabIndex={-1}>
      {isReviewPreview && <p className="review-note">Shop-Vorschau · Vormerkung im Testmodus</p>}
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/produkt/:id" element={<ProductPage add={add} />} />
      <Route path="/bestaetigen" element={<Confirm />} />
      <Route path="*" element={<NotFound />} />
    </Routes></main>
    <footer className="site-footer"><Link className="wordmark" to="/">GZN<span>.</span></Link>
      <nav aria-label="Footer">
        {import.meta.env.VITE_IMPRINT_URL && <a href={import.meta.env.VITE_IMPRINT_URL}>Impressum</a>}
        {import.meta.env.VITE_PRIVACY_URL && <a href={import.meta.env.VITE_PRIVACY_URL}>Datenschutz</a>}
        {supportUrl && <a href={supportUrl} target="_blank" rel="noopener noreferrer">Support GZN ↗</a>}
      </nav>
    </footer>
    <Cart lines={lines} update={update} dialog={cart} />
  </>
}
const Router = isReviewPreview ? MemoryRouter : BrowserRouter
createRoot(document.getElementById('root')!).render(<Router><App /></Router>)
