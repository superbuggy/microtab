<script setup lang="ts">
import { hsl } from "@/helpers";
import { useGuitar } from "@/state/guitar";
import { useTemperament } from "@/state/temperament";
import { useStaffNotation } from "@/composables/useStaffNotation";
import {
  formatStaffNoteLabel,
  type StaffNote,
} from "@/definitions/staff-notation";
import {
  GLYPH_SHARP,
  GLYPH_FLAT,
  GLYPH_NATURAL,
  GLYPH_DOUBLE_SHARP,
  GLYPH_DOUBLE_FLAT,
  GLYPH_UP_ARROW,
  GLYPH_DOWN_ARROW,
  GLYPH_TREBLE_CLEF,
  type GlyphDef,
} from "@/definitions/staff-glyphs";

const { pitchClassNames, divisionsPerOctave } = useTemperament();
const { selectedScale } = useGuitar();

const {
  staffNotes,
  noteX,
  noteY,
  noteLedgerLines,
  ledgerLineY,
  STAFF_LINE_SPACING,
  STAFF_TOP_Y,
  STAFF_WIDTH,
  CLEF_WIDTH,
} = useStaffNotation(selectedScale, pitchClassNames, divisionsPerOctave);

const VIEWBOX_WIDTH = 780;
const VIEWBOX_HEIGHT = 180;
const NOTE_RADIUS_X = 7;
const NOTE_RADIUS_Y = 5.5;
const LEDGER_LINE_HALF_WIDTH = 12;

function staffLineY(index: number): number {
  return STAFF_TOP_Y + (4 - index) * STAFF_LINE_SPACING;
}

function accidentalGlyph(acc: string): GlyphDef | null {
  switch (acc) {
    case 'sharp': return GLYPH_SHARP;
    case 'flat': return GLYPH_FLAT;
    case 'natural': return GLYPH_NATURAL;
    case 'doubleSharp': return GLYPH_DOUBLE_SHARP;
    case 'doubleFlat': return GLYPH_DOUBLE_FLAT;
    default: return null;
  }
}

function arrowGlyph(arrows: number): GlyphDef {
  return arrows > 0 ? GLYPH_UP_ARROW : GLYPH_DOWN_ARROW;
}

function noteColor(note: StaffNote): string {
  return hsl(note.scaleDegree, staffNotes.value.length, 50);
}

</script>

<template>
  <div class="staff-container">
    <div class="staff-header">
      <span class="edo-label">{{ divisionsPerOctave }} TET — Ups & Downs Notation</span>
    </div>
    <svg
      :viewBox="`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`"
      class="staff-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Staff lines -->
      <g class="staff-lines">
        <line
          v-for="i in 5"
          :key="i"
          :x1="CLEF_WIDTH"
          :y1="staffLineY(i - 1)"
          :x2="STAFF_WIDTH"
          :y2="staffLineY(i - 1)"
          stroke="#333"
          stroke-width="1"
        />
      </g>

      <!-- Treble clef -->
      <g class="clef" :transform="`translate(${CLEF_WIDTH + 4}, ${STAFF_TOP_Y - 16})`">
        <path
          :d="GLYPH_TREBLE_CLEF.path"
          fill="#333"
          stroke="none"
          transform="scale(1.2)"
        />
      </g>

      <!-- Notes -->
      <g class="notes-group">
        <g
          v-for="(note, index) in staffNotes"
          :key="note.pitchClass + '-' + index"
          :transform="`translate(${noteX(index)}, 0)`"
        >
          <!-- Ledger lines -->
          <line
            v-for="ledgerPos in noteLedgerLines(note)"
            :key="'ledger-' + ledgerPos"
            :x1="-LEDGER_LINE_HALF_WIDTH"
            :y1="ledgerLineY(ledgerPos)"
            :x2="LEDGER_LINE_HALF_WIDTH"
            :y2="ledgerLineY(ledgerPos)"
            stroke="#333"
            stroke-width="1.2"
          />

          <!-- Up/Down arrows (LEFT of accidental and note) -->
          <g v-if="note.arrows !== 0">
            <path
              v-for="n in Math.abs(note.arrows)"
              :key="'arrow-' + n"
              :d="arrowGlyph(note.arrows).path"
              :transform="`translate(${
                -(NOTE_RADIUS_X + 4 + (note.accidental ? (accidentalGlyph(note.accidental)?.width ?? 0) + 4 : 0) + n * (arrowGlyph(note.arrows).width + 1))
              }, ${noteY(note) - arrowGlyph(note.arrows).baseline})`"
              fill="#333"
              stroke="none"
            />
          </g>

          <!-- Accidental (LEFT of note, RIGHT of arrows) -->
          <g v-if="note.accidental && accidentalGlyph(note.accidental)">
            <path
              :d="accidentalGlyph(note.accidental)!.path"
              :transform="`translate(${-(NOTE_RADIUS_X + 3 + accidentalGlyph(note.accidental)!.width)}, ${noteY(note) - accidentalGlyph(note.accidental)!.baseline})`"
              fill="#333"
              stroke="#333"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </g>

          <!-- Note head -->
          <ellipse
            :cx="0"
            :cy="noteY(note)"
            :rx="NOTE_RADIUS_X"
            :ry="NOTE_RADIUS_Y"
            :fill="noteColor(note)"
            stroke="#222"
            stroke-width="1.2"
            :transform="`rotate(-8, 0, ${noteY(note)})`"
          />

          <!-- Note label (below staff) -->
          <text
            :x="0"
            :y="STAFF_TOP_Y + 4 * STAFF_LINE_SPACING + 24"
            text-anchor="middle"
            font-size="10"
            font-family="monospace"
            fill="#444"
          >
            {{ formatStaffNoteLabel(note) }}
          </text>

          <!-- Scale degree number (above staff) -->
          <text
            :x="0"
            :y="STAFF_TOP_Y - 16"
            text-anchor="middle"
            font-size="9"
            font-family="monospace"
            fill="#888"
          >
            {{ note.scaleDegree + 1 }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.staff-container {
  margin: 0 auto 1rem;
  max-width: 800px;
  padding: 0 1rem;
}

.staff-header {
  margin-bottom: 0.5rem;
}

.edo-label {
  font-size: 0.85rem;
  font-family: monospace;
  color: #666;
}

.staff-svg {
  width: 100%;
  max-height: 200px;
  display: block;
}

.staff-lines line {
  shape-rendering: crispEdges;
}

ellipse {
  cursor: pointer;
  transition: stroke-width 0.3s ease;
}

ellipse:hover {
  stroke: rgba(255, 255, 255, 0.6);
  stroke-width: 3px;
}
</style>
