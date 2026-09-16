import QRCode from 'qrcode'
import { MARK_ZEICHEN, istMarkSymbol } from './marken'
import type { Item, ItemContent, Tag } from './types'
import { appUrl } from './util'

/* Ausgabe auf Papier und in Dateien.
 *
 * Hier wird genau EIN HTML gebaut. Die Vorschau am Bildschirm zeigt dieses
 * HTML, der Druck druckt dieses HTML, und die Word-Datei enthaelt dieses
 * HTML. Es gibt bewusst keine zweite Fassung fuer die Vorschau: zwei
 * Fassungen laufen auseinander, und dann zeigt die Vorschau etwas anderes,
 * als auf dem Blatt landet.
 *
 * Alle Angaben stehen direkt am Element. Word und der Druckdialog nehmen
 * keine Stilklassen von aussen an.
 */

/* ------------------------------------------------------------- QR-Code */

/** QR-Code als PNG in einer Datenadresse. Wird so gebraucht, weil Word
 *  kein SVG aus einer Datei uebernimmt, ein eingebettetes PNG aber schon. */
export function qrDatenBild(wert: string, px = 120): string | null {
  try {
    const qr = QRCode.create(wert, { errorCorrectionLevel: 'M' })
    const n = qr.modules.size
    const daten = qr.modules.data
    const rand = 2
    const gesamt = n + rand * 2
    const punkt = Math.max(1, Math.floor(px / gesamt))
    const seite = punkt * gesamt

    const leinwand = document.createElement('canvas')
    leinwand.width = seite
    leinwand.height = seite
    const ctx = leinwand.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, seite, seite)
    ctx.fillStyle = '#000000'
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (daten[y * n + x]) {
          ctx.fillRect((x + rand) * punkt, (y + rand) * punkt, punkt, punkt)
        }
      }
    }
    return leinwand.toDataURL('image/png')
  } catch (err) {
    console.warn('[ausgabe] QR-Code konnte nicht erzeugt werden:', err)
    return null
  }
}

/* --------------------------------------------------------------- Farben */

/** Eine Farbe mit Weiss mischen. Auf Papier wird nichts durchsichtig
 *  gedruckt, darum wird der fertige Ton hier ausgerechnet. */
function aufWeiss(hex: string, anteil: number): string | null {
  const wert = hex.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(wert)) return null
  const r = parseInt(wert.slice(1, 3), 16)
  const g = parseInt(wert.slice(3, 5), 16)
  const b = parseInt(wert.slice(5, 7), 16)
  const m = (k: number) => Math.round(255 + (k - 255) * anteil)
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`
}

/** Denselben Ton eine Spur dunkler. Das ist der Zebrastreifen auf Papier. */
function dunkler(farbe: string, faktor = 0.93): string {
  const treffer = farbe.match(/rgb\((\d+), (\d+), (\d+)\)/)
  if (!treffer) return farbe
  const [r, g, b] = [1, 2, 3].map((i) => Math.round(Number(treffer[i]) * faktor))
  return `rgb(${r}, ${g}, ${b})`
}

/* -------------------------------------------------------------- Spalten */

export const SPALTEN = [
  'qr',
  'code',
  'titel',
  'zimmer',
  'person',
  'groesse',
  'status',
  'inhalt',
  'notiz',
] as const
export type Spalte = (typeof SPALTEN)[number]

export interface AusgabeOpt {
  /** Ueberschrift ueber der Tabelle, meist der Name des Umzugs. */
  titel: string
  untertitel?: string
  items: Item[]
  tagById: (id: string | null | undefined) => Tag | undefined
  inhalte?: Map<string, ItemContent[]>
  spalten: Spalte[]
  /** Farben von Zimmer, Person und Markierung mitdrucken. */
  farben: boolean
  /** Zeichen der Markierung mitdrucken. */
  symbole: boolean
  rtl: boolean
  qrGroesse: number
  /** Uebersetzung. Kommt von aussen, damit diese Datei nichts ueber
   *  React oder die aktuelle Sprache wissen muss. */
  t: (key: string, vars?: Record<string, string | number>) => string
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Der Farbton einer Zeile, schon fertig gemischt. Ohne eigene Farbe ist
 *  es Weiss. Der Zebrastreifen kommt danach obendrauf. */
function grundton(item: Item, opt: AusgabeOpt): string {
  if (!opt.farben) return 'rgb(255, 255, 255)'
  const zimmer = opt.tagById(item.room_id)
  const person = opt.tagById(item.person_id)
  const quelle = item.mark_color ?? zimmer?.color ?? person?.color ?? null
  if (!quelle) return 'rgb(255, 255, 255)'
  return aufWeiss(quelle, item.mark_color ? 0.22 : 0.14) ?? 'rgb(255, 255, 255)'
}

function zellenText(item: Item, spalte: Spalte, opt: AusgabeOpt): string {
  const zimmer = opt.tagById(item.room_id)
  const person = opt.tagById(item.person_id)
  switch (spalte) {
    case 'code':
      return item.code
    case 'titel':
      return item.title || opt.t(`art.${item.kind}`)
    case 'zimmer':
      return zimmer?.name ?? ''
    case 'person':
      return person?.name ?? ''
    case 'groesse':
      return `${item.size}`
    case 'status':
      return opt.t(`status.${item.status}`)
    case 'notiz':
      return item.note ?? ''
    case 'inhalt': {
      const liste = opt.inhalte?.get(item.id) ?? []
      return liste.map((c) => (c.qty > 1 ? `${c.qty}x ${c.text}` : c.text)).join(', ')
    }
    default:
      return ''
  }
}

/** Baut die Tabelle. Dieses Stueck HTML ist die Vorschau, der Druck und
 *  der Inhalt der Word-Datei. */
export function bauTabelle(opt: AusgabeOpt): string {
  const richtung = opt.rtl ? 'rtl' : 'ltr'
  const seite = opt.rtl ? 'right' : 'left'
  const kopf = opt.spalten
    .map(
      (s) =>
        `<th style="border:1px solid #999;padding:5px 7px;text-align:${seite};background:#e8e8e8;font-size:11pt">${escape(
          opt.t(`ausgabe.spalte_${s}`),
        )}</th>`,
    )
    .join('')

  const zeilen = opt.items
    .map((item, i) => {
      const grund = grundton(item, opt)
      // Der Wechsel hell/dunkel gilt IMMER, auch mit eigenen Farben.
      const ton = i % 2 === 1 ? dunkler(grund) : grund
      const zellen = opt.spalten
        .map((s) => {
          const stil = `border:1px solid #bbb;padding:5px 7px;vertical-align:top;font-size:11pt;text-align:${seite}`
          if (s === 'qr') {
            const bild = qrDatenBild(appUrl(`s/${item.id}`), opt.qrGroesse)
            const inhalt = bild
              ? `<img src="${bild}" width="${opt.qrGroesse}" height="${opt.qrGroesse}" alt="${escape(item.code)}" />`
              : escape(item.code)
            return `<td style="${stil};text-align:center;width:${opt.qrGroesse + 14}px">${inhalt}</td>`
          }
          if (s === 'code') {
            const zeichen =
              opt.symbole && istMarkSymbol(item.mark_symbol)
                ? ` <span style="font-weight:700">${MARK_ZEICHEN[item.mark_symbol]}</span>`
                : ''
            // Die Nummer bleibt in jeder Sprache von links nach rechts.
            return `<td style="${stil};white-space:nowrap"><span dir="ltr" style="font-family:Consolas,'Courier New',monospace;font-weight:700;font-size:12pt">${escape(
              item.code,
            )}</span>${zeichen}</td>`
          }
          return `<td style="${stil}">${escape(zellenText(item, s, opt))}</td>`
        })
        .join('')
      return `<tr style="background:${ton}">${zellen}</tr>`
    })
    .join('')

  return [
    `<div dir="${richtung}" style="font-family:Calibri,Arial,sans-serif;color:#111">`,
    `<h1 style="font-size:17pt;margin:0 0 2pt 0">${escape(opt.titel)}</h1>`,
    opt.untertitel
      ? `<p style="font-size:10pt;color:#555;margin:0 0 10pt 0">${escape(opt.untertitel)}</p>`
      : '<div style="height:10pt"></div>',
    `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%">`,
    `<thead><tr>${kopf}</tr></thead>`,
    `<tbody>${zeilen}</tbody>`,
    '</table>',
    `<p style="font-size:9pt;color:#666;margin-top:10pt">${escape(
      opt.t('ausgabe.fusszeile', { n: opt.items.length }),
    )}</p>`,
    '</div>',
  ].join('')
}

/* ------------------------------------------------------- Datei erzeugen */

function herunterladen(dateiname: string, inhalt: BlobPart, typ: string): void {
  const blob = new Blob([inhalt], { type: typ })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dateiname
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Kurz warten, sonst bricht der Download in manchen Browsern ab.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Word-Datei. Das ist ein HTML-Dokument mit Word-Kopf. Word und
 *  LibreOffice oeffnen es als gewoehnliches Dokument und man kann darin
 *  weiterschreiben. Es ist ausdruecklich KEIN .docx im Zip-Format.
 *
 *  @param format  Papierformat fuer die Seitenraender im Dokument.
 */
export function alsWord(dateiname: string, tabelle: string, format: 'A4' | 'A3' | 'A5'): void {
  const groessen = { A5: '148mm 210mm', A4: '210mm 297mm', A3: '297mm 420mm' }
  const kopf = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" ',
    'xmlns:w="urn:schemas-microsoft-com:office:word" ',
    'xmlns="http://www.w3.org/TR/REC-html40">',
    '<head><meta charset="utf-8">',
    `<style>@page { size: ${groessen[format]}; margin: 15mm } body { margin: 0 }</style>`,
    '</head><body>',
  ].join('')
  herunterladen(dateiname, '﻿' + kopf + tabelle + '</body></html>', 'application/msword')
}

/** Dieselbe Tabelle als eigenstaendige HTML-Datei. Sie oeffnet sich in
 *  jedem Browser und laesst sich von dort ohne Umweg als PDF speichern,
 *  auch auf einem Rechner ohne Word. */
export function alsHtml(dateiname: string, titel: string, tabelle: string): void {
  const doc = [
    '<!doctype html><html><head><meta charset="utf-8">',
    `<title>${escape(titel)}</title>`,
    '<style>body{margin:16mm;background:#fff}@media print{body{margin:0}}</style>',
    '</head><body>',
    tabelle,
    '</body></html>',
  ].join('')
  herunterladen(dateiname, doc, 'text/html;charset=utf-8')
}

/** Name fuer die Datei. Ohne Zeichen, die Dateisysteme nicht moegen. */
export function dateiname(basis: string, endung: string, datum: Date): string {
  const sauber = basis.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-')
  const tag = datum.toISOString().slice(0, 10)
  return `${sauber || 'kistly'}-${tag}.${endung}`
}
