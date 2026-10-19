import React from "react";
import type { ClipartItem } from "./types";

export const CLIPART_LIBRARY: ClipartItem[] = [
  // ================= TOYS & PLAY =================
  {
    id: "balloon",
    name: "Balloon",
    category: "toys",
    tags: ["balloon", "party", "b", "toy", "air", "flying"],
    svgViewBox: "0 0 100 120",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Balloon body */}
        <path d="M50 10 C25 10 15 35 15 55 C15 78 35 90 47 94 L45 98 L55 98 L53 94 C65 90 85 78 85 55 C85 35 75 10 50 10 Z" />
        {/* Highlight sheen */}
        <path d="M30 30 C30 22 38 18 46 18" strokeWidth="2.5" />
        {/* String */}
        <path d="M50 98 Q42 105 52 110 T48 118" strokeWidth="2" strokeDasharray="1 0" />
      </svg>
    ),
  },
  {
    id: "ball",
    name: "Ball",
    category: "toys",
    tags: ["ball", "football", "play", "b", "toy", "sports", "round"],
    svgViewBox: "0 0 100 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="50" cy="50" r="42" />
        {/* Curved beach-ball / sports panels */}
        <path d="M50 8 C30 25 30 75 50 92" />
        <path d="M50 8 C70 25 70 75 50 92" />
        <line x1="8" y1="50" x2="92" y2="50" />
      </svg>
    ),
  },
  {
    id: "kite",
    name: "Kite",
    category: "toys",
    tags: ["kite", "k", "sky", "wind", "fly", "toy"],
    svgViewBox: "0 0 100 120",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Diamond frame */}
        <polygon points="50,10 88,48 50,86 12,48" />
        <line x1="50" y1="10" x2="50" y2="86" />
        <path d="M12 48 Q50 62 88 48" />
        {/* Tail and bows */}
        <path d="M50 86 Q40 98 55 106 T48 118" strokeWidth="2" />
        <polygon points="42,97 50,95 46,101" fill="currentColor" />
        <polygon points="54,106 62,104 58,110" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "car",
    name: "Car",
    category: "toys",
    tags: ["car", "c", "vehicle", "toy", "drive", "wheels"],
    svgViewBox: "0 0 110 70",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 110 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Car body */}
        <path d="M12 42 L25 42 L35 22 L75 22 L86 42 L98 42 C102 42 105 45 105 49 L105 54 L92 54" />
        <path d="M72 54 L38 54" />
        <path d="M18 54 L5 54 C3 54 2 52 2 49 L2 44 C2 42 7 42 12 42 Z" />
        {/* Windows */}
        <path d="M38 40 L40 26 L55 26 L55 40 Z" />
        <path d="M60 26 L73 26 L81 40 L60 40 Z" />
        {/* Wheels */}
        <circle cx="28" cy="54" r="10" />
        <circle cx="28" cy="54" r="4" />
        <circle cx="82" cy="54" r="10" />
        <circle cx="82" cy="54" r="4" />
      </svg>
    ),
  },
  {
    id: "teddy",
    name: "Teddy Bear",
    category: "toys",
    tags: ["teddy", "bear", "toy", "t", "doll", "cute"],
    svgViewBox: "0 0 100 110",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Ears */}
        <circle cx="28" cy="24" r="12" />
        <circle cx="72" cy="24" r="12" />
        {/* Head */}
        <circle cx="50" cy="38" r="24" />
        {/* Snout */}
        <ellipse cx="50" cy="44" rx="10" ry="7" />
        <polygon points="47,41 53,41 50,45" fill="currentColor" />
        {/* Eyes */}
        <circle cx="41" cy="33" r="2.5" fill="currentColor" />
        <circle cx="59" cy="33" r="2.5" fill="currentColor" />
        {/* Body */}
        <ellipse cx="50" cy="74" rx="22" ry="24" />
        {/* Belly circle */}
        <ellipse cx="50" cy="74" rx="13" ry="15" strokeDasharray="3 3" />
        {/* Arms */}
        <path d="M28 62 C18 64 16 75 22 80 C26 82 32 76 31 70" />
        <path d="M72 62 C82 64 84 75 78 80 C74 82 68 76 69 70" />
        {/* Feet */}
        <ellipse cx="32" cy="98" rx="10" ry="6" />
        <ellipse cx="68" cy="98" rx="10" ry="6" />
      </svg>
    ),
  },
  {
    id: "drum",
    name: "Drum",
    category: "toys",
    tags: ["drum", "d", "music", "beat", "instrument", "toy"],
    svgViewBox: "0 0 100 90",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 90"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Top ellipse */}
        <ellipse cx="50" cy="25" rx="36" ry="12" />
        {/* Sides and bottom */}
        <path d="M14 25 L14 62 C14 72 86 72 86 62 L86 25" />
        {/* Zigzag cords */}
        <path d="M14 25 L32 68 L50 25 L68 68 L86 25" />
        {/* Drumsticks */}
        <line x1="20" y1="10" x2="42" y2="24" strokeWidth="2.5" />
        <circle cx="43" cy="25" r="3" fill="currentColor" />
        <line x1="80" y1="10" x2="58" y2="24" strokeWidth="2.5" />
        <circle cx="57" cy="25" r="3" fill="currentColor" />
      </svg>
    ),
  },

  // ================= ANIMALS =================
  {
    id: "cat",
    name: "Cat",
    category: "animals",
    tags: ["cat", "c", "kitten", "pet", "meow", "animal"],
    svgViewBox: "0 0 100 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Head with pointed ears */}
        <path d="M26 40 L20 16 L40 28 C43 27 47 26 50 26 C53 26 57 27 60 28 L80 16 L74 40 C80 48 80 62 72 70 C66 76 58 78 50 78 C42 78 34 76 28 70 C20 62 20 48 26 40 Z" />
        {/* Eyes */}
        <circle cx="38" cy="48" r="3.5" fill="currentColor" />
        <circle cx="62" cy="48" r="3.5" fill="currentColor" />
        {/* Nose & mouth */}
        <polygon points="48,56 52,56 50,59" fill="currentColor" />
        <path d="M46 62 Q50 66 54 62" />
        {/* Whiskers */}
        <line x1="16" y1="52" x2="30" y2="54" />
        <line x1="15" y1="60" x2="30" y2="59" />
        <line x1="70" y1="54" x2="84" y2="52" />
        <line x1="70" y1="59" x2="85" y2="60" />
      </svg>
    ),
  },
  {
    id: "dog",
    name: "Dog",
    category: "animals",
    tags: ["dog", "d", "puppy", "pet", "bark", "animal"],
    svgViewBox: "0 0 100 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Floppy ears */}
        <path d="M24 28 C12 35 10 58 20 62 C26 64 30 54 28 42" />
        <path d="M76 28 C88 35 90 58 80 62 C74 64 70 54 72 42" />
        {/* Head */}
        <ellipse cx="50" cy="45" rx="26" ry="24" />
        {/* Snout */}
        <ellipse cx="50" cy="54" rx="14" ry="10" />
        <ellipse cx="50" cy="50" rx="5" ry="3.5" fill="currentColor" />
        <path d="M46 58 Q50 62 54 58" />
        {/* Eyes */}
        <circle cx="39" cy="38" r="3" fill="currentColor" />
        <circle cx="61" cy="38" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "elephant",
    name: "Elephant",
    category: "animals",
    tags: ["elephant", "e", "animal", "jungle", "trunk", "big"],
    svgViewBox: "0 0 110 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 110 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Big ear */}
        <path d="M38 24 C18 20 12 45 16 65 C20 78 35 78 40 70" />
        {/* Head and back */}
        <path d="M38 24 C45 15 62 14 74 22 C92 34 98 56 94 82 L86 82 L84 65 L72 65 L70 82 L62 82 C60 74 62 60 55 58 C48 58 46 64 45 82 L38 82" />
        {/* Trunk swinging up */}
        <path d="M72 26 C82 32 86 44 82 58 C78 70 66 72 65 64 C64 58 72 54 74 46" />
        {/* Eye */}
        <circle cx="58" cy="30" r="2.5" fill="currentColor" />
        {/* Tail */}
        <path d="M94 50 Q98 55 96 62" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "fish",
    name: "Fish",
    category: "animals",
    tags: ["fish", "f", "water", "sea", "swim", "animal"],
    svgViewBox: "0 0 100 80",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Fish body */}
        <path d="M84 40 C65 15 25 15 10 40 C25 65 65 65 84 40 Z" />
        {/* Tail fin */}
        <polygon points="84,40 96,20 92,40 96,60" />
        {/* Fin */}
        <path d="M42 22 Q48 10 56 18" />
        {/* Eye */}
        <circle cx="26" cy="36" r="3.5" fill="currentColor" />
        {/* Gill arc */}
        <path d="M36 28 C40 36 40 44 36 52" />
      </svg>
    ),
  },
  {
    id: "duck",
    name: "Duck",
    category: "animals",
    tags: ["duck", "d", "bird", "quack", "water", "animal"],
    svgViewBox: "0 0 100 90",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 90"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Head */}
        <circle cx="36" cy="28" r="16" />
        {/* Beak */}
        <path d="M22 28 C12 28 8 32 12 36 L24 36" />
        {/* Eye */}
        <circle cx="32" cy="24" r="2.5" fill="currentColor" />
        {/* Body */}
        <path d="M44 40 C60 40 82 46 90 60 C90 75 75 80 50 80 C30 80 20 74 24 64 C28 54 36 48 44 40 Z" />
        {/* Wing arc */}
        <path d="M48 54 Q64 50 72 62" />
      </svg>
    ),
  },
  {
    id: "butterfly",
    name: "Butterfly",
    category: "animals",
    tags: ["butterfly", "b", "insect", "wings", "garden", "animal"],
    svgViewBox: "0 0 100 90",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 90"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Body */}
        <line x1="50" y1="24" x2="50" y2="76" strokeWidth="4" />
        <circle cx="50" cy="20" r="4" fill="currentColor" />
        {/* Antennae */}
        <path d="M48 18 Q40 8 34 12" />
        <path d="M52 18 Q60 8 66 12" />
        {/* Wings */}
        <path d="M50 30 C20 10 10 40 48 54" />
        <path d="M50 30 C80 10 90 40 52 54" />
        <path d="M48 56 C15 54 18 80 48 72" />
        <path d="M52 56 C85 54 82 80 52 72" />
      </svg>
    ),
  },

  // ================= FRUITS & VEG =================
  {
    id: "apple",
    name: "Apple",
    category: "fruits",
    tags: ["apple", "a", "fruit", "sweet", "healthy", "red"],
    svgViewBox: "0 0 100 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Apple body */}
        <path d="M50 32 C35 15 12 28 15 56 C18 82 40 92 50 92 C60 92 82 82 85 56 C88 28 65 15 50 32 Z" />
        {/* Stem */}
        <path d="M50 30 C50 16 58 10 62 8" strokeWidth="3" />
        {/* Leaf */}
        <path d="M54 22 C65 18 70 24 72 25 C64 28 58 26 54 22 Z" fill="none" />
      </svg>
    ),
  },
  {
    id: "mango",
    name: "Mango",
    category: "fruits",
    tags: ["mango", "m", "fruit", "king", "sweet", "summer"],
    svgViewBox: "0 0 100 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Mango body with characteristic curved tip */}
        <path d="M45 22 C25 24 16 46 22 68 C28 88 52 94 66 86 C82 76 86 52 76 34 C68 22 56 20 45 22 Z" />
        {/* Stem and leaf */}
        <path d="M48 22 L46 12" />
        <path d="M47 16 C58 12 66 16 68 18 C60 22 52 20 47 16 Z" />
      </svg>
    ),
  },
  {
    id: "icecream",
    name: "Ice Cream",
    category: "fruits",
    tags: ["icecream", "i", "cone", "sweet", "summer", "treat"],
    svgViewBox: "0 0 90 120",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 90 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Scoop of ice cream */}
        <path d="M20 54 C15 48 16 30 30 20 C38 12 52 12 60 20 C74 30 75 48 70 54 C66 58 24 58 20 54 Z" />
        {/* Cherry on top */}
        <circle cx="45" cy="14" r="5" />
        <path d="M47 10 Q54 4 58 6" strokeWidth="2" />
        {/* Waffle cone */}
        <polygon points="20,54 70,54 45,114" />
        {/* Waffle grid lines */}
        <line x1="28" y1="64" x2="62" y2="74" strokeWidth="2" />
        <line x1="34" y1="80" x2="56" y2="88" strokeWidth="2" />
        <line x1="62" y1="64" x2="28" y2="74" strokeWidth="2" />
        <line x1="56" y1="80" x2="34" y2="88" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "grapes",
    name: "Grapes",
    category: "fruits",
    tags: ["grapes", "g", "fruit", "bunch", "sweet", "purple"],
    svgViewBox: "0 0 100 110",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Stem & leaf */}
        <path d="M50 20 L50 8" />
        <path d="M50 14 C35 10 30 18 32 20 C42 22 48 18 50 14 Z" />
        {/* Row 1 (top) */}
        <circle cx="38" cy="30" r="10" />
        <circle cx="56" cy="30" r="10" />
        {/* Row 2 */}
        <circle cx="28" cy="46" r="10" />
        <circle cx="47" cy="46" r="10" />
        <circle cx="66" cy="46" r="10" />
        {/* Row 3 */}
        <circle cx="38" cy="62" r="10" />
        <circle cx="56" cy="62" r="10" />
        {/* Row 4 */}
        <circle cx="47" cy="78" r="10" />
        {/* Row 5 bottom */}
        <circle cx="47" cy="94" r="9" />
      </svg>
    ),
  },

  // ================= SHAPES & NATURE =================
  {
    id: "star",
    name: "Star",
    category: "shapes",
    tags: ["star", "s", "shape", "sky", "night", "gold"],
    svgViewBox: "0 0 100 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <polygon points="50,8 63,35 93,38 71,59 78,89 50,73 22,89 29,59 7,38 37,35" />
      </svg>
    ),
  },
  {
    id: "sun",
    name: "Sun",
    category: "shapes",
    tags: ["sun", "s", "sky", "day", "bright", "warm", "nature"],
    svgViewBox: "0 0 100 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="50" cy="50" r="22" />
        {/* Sun rays */}
        <line x1="50" y1="12" x2="50" y2="20" />
        <line x1="50" y1="80" x2="50" y2="88" />
        <line x1="12" y1="50" x2="20" y2="50" />
        <line x1="80" y1="50" x2="88" y2="50" />
        <line x1="23" y1="23" x2="29" y2="29" />
        <line x1="71" y1="71" x2="77" y2="77" />
        <line x1="77" y1="23" x2="71" y2="29" />
        <line x1="29" y1="71" x2="23" y2="77" />
      </svg>
    ),
  },
  {
    id: "flower",
    name: "Flower",
    category: "shapes",
    tags: ["flower", "f", "garden", "nature", "petals", "plant"],
    svgViewBox: "0 0 100 110",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Petals */}
        <circle cx="50" cy="24" r="14" />
        <circle cx="70" cy="38" r="14" />
        <circle cx="62" cy="62" r="14" />
        <circle cx="38" cy="62" r="14" />
        <circle cx="30" cy="38" r="14" />
        {/* Center */}
        <circle cx="50" cy="44" r="12" />
        {/* Stem & Leaves */}
        <path d="M50 74 L50 106" strokeWidth="3" />
        <path d="M50 88 C38 84 32 90 34 94 C44 96 48 90 50 88 Z" />
        <path d="M50 82 C62 78 68 84 66 88 C56 90 52 84 50 82 Z" />
      </svg>
    ),
  },
  {
    id: "tree",
    name: "Tree",
    category: "shapes",
    tags: ["tree", "t", "nature", "wood", "green", "plant"],
    svgViewBox: "0 0 100 110",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Trunk */}
        <path d="M42 66 L42 104 L58 104 L58 66" />
        {/* Fluffy canopy */}
        <path d="M30 68 C14 66 12 45 26 38 C20 22 40 12 50 20 C60 12 80 22 74 38 C88 45 86 66 70 68 C64 68 36 68 30 68 Z" />
      </svg>
    ),
  },
  {
    id: "umbrella",
    name: "Umbrella",
    category: "objects",
    tags: ["umbrella", "u", "rain", "monsoon", "weather", "water"],
    svgViewBox: "0 0 100 110",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Canopy top */}
        <path d="M12 56 C16 20 84 20 88 56 C80 50 72 50 64 56 C56 50 44 50 36 56 C28 50 20 50 12 56 Z" />
        {/* Spire */}
        <line x1="50" y1="20" x2="50" y2="12" strokeWidth="3" />
        {/* Handle */}
        <path d="M50 54 L50 92 C50 102 60 102 60 94" strokeWidth="3" />
      </svg>
    ),
  },
  {
    id: "pencil",
    name: "Pencil",
    category: "objects",
    tags: ["pencil", "p", "write", "school", "draw", "stationery"],
    svgViewBox: "0 0 110 50",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 110 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Eraser and ferrule */}
        <path d="M10 16 L22 16 L22 34 L10 34 C6 34 4 30 4 25 C4 20 6 16 10 16 Z" />
        <line x1="22" y1="16" x2="28" y2="16" />
        <line x1="22" y1="34" x2="28" y2="34" />
        <line x1="28" y1="16" x2="28" y2="34" />
        {/* Pencil body */}
        <rect x="28" y="16" width="56" height="18" />
        <line x1="28" y1="22" x2="84" y2="22" strokeWidth="1.5" strokeDasharray="2 1" />
        <line x1="28" y1="28" x2="84" y2="28" strokeWidth="1.5" strokeDasharray="2 1" />
        {/* Tip */}
        <polygon points="84,16 106,25 84,34" />
        <polygon points="98,22 106,25 98,28" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "clock",
    name: "Clock",
    category: "objects",
    tags: ["clock", "c", "time", "hour", "watch", "round"],
    svgViewBox: "0 0 100 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="50" cy="50" r="42" />
        <circle cx="50" cy="50" r="3" fill="currentColor" />
        {/* Hour markers */}
        <line x1="50" y1="14" x2="50" y2="20" strokeWidth="3" />
        <line x1="50" y1="80" x2="50" y2="86" strokeWidth="3" />
        <line x1="14" y1="50" x2="20" y2="50" strokeWidth="3" />
        <line x1="80" y1="50" x2="86" y2="50" strokeWidth="3" />
        {/* Hands showing 3:00 */}
        <line x1="50" y1="50" x2="50" y2="26" strokeWidth="3" />
        <line x1="50" y1="50" x2="70" y2="50" strokeWidth="3.5" />
      </svg>
    ),
  },
  {
    id: "house",
    name: "House",
    category: "objects",
    tags: ["house", "h", "home", "building", "cottage"],
    svgViewBox: "0 0 100 100",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Roof */}
        <polygon points="50,14 88,44 12,44" />
        {/* Chimney */}
        <polygon points="70,22 78,22 78,34 70,28" />
        {/* Walls */}
        <rect x="20" y="44" width="60" height="46" />
        {/* Door */}
        <rect x="42" y="62" width="16" height="28" />
        <circle cx="54" cy="76" r="1.5" fill="currentColor" />
        {/* Window */}
        <rect x="26" y="52" width="12" height="12" />
        <line x1="32" y1="52" x2="32" y2="64" strokeWidth="1.5" />
        <line x1="26" y1="58" x2="38" y2="58" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "cup",
    name: "Cup",
    category: "objects",
    tags: ["cup", "c", "tea", "coffee", "drink", "milk"],
    svgViewBox: "0 0 100 90",
    renderSvg: (size = 64, className = "") => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 90"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* Cup body */}
        <path d="M20 20 L26 70 C28 78 72 78 74 70 L80 20 Z" />
        {/* Handle */}
        <path d="M78 30 C90 32 92 56 76 60" />
        {/* Saucer */}
        <path d="M12 80 Q50 88 88 80" />
      </svg>
    ),
  },
];

export function getClipartById(id: string): ClipartItem | undefined {
  return CLIPART_LIBRARY.find((c) => c.id === id);
}

export function searchClipart(query: string, category?: string): ClipartItem[] {
  const cleanQ = query.trim().toLowerCase();
  return CLIPART_LIBRARY.filter((item) => {
    if (category && category !== "all" && item.category !== category) {
      return false;
    }
    if (!cleanQ) return true;
    return (
      item.name.toLowerCase().includes(cleanQ) ||
      item.tags.some((t) => t.toLowerCase().includes(cleanQ))
    );
  });
}
