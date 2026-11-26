import type { StandardCurriculumPreset } from "./syllabusImport";

/**
 * General Knowledge and Drawing for Nursery to Class 8. The school uses no textbook for either, so each class gets
 * a topic list (editable in Books & syllabus) that the GK and Drawing patterns' questions are spread across.
 * Both papers are usually held together on one day of the date sheet.
 */
export const MINOR_SUBJECT_CLASSES = ["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"] as const;
type MinorClass = (typeof MINOR_SUBJECT_CLASSES)[number];

const SCHOOL = "School topics (no textbook)";

const GK: Record<MinorClass, string[]> = {
  Nursery: ["Myself and My Family", "Colours Around Us", "Fruits and Vegetables", "Animals and Their Sounds", "Birds Around Us", "Means of Transport", "Good Habits", "Festivals We Celebrate"],
  LKG: ["My Body", "My Home and School", "Domestic and Wild Animals", "Fruits, Vegetables and Flowers", "Shapes and Colours", "Means of Transport", "People Who Help Us", "Festivals and Good Manners"],
  UKG: ["My Body and Senses", "Animals and Their Young Ones", "Birds and Insects", "Food We Eat", "Seasons and Weather", "Transport and Safety Rules", "Community Helpers", "Our Country – National Symbols"],
  "Class 1": ["Myself and My Family", "Animals and Their Homes", "Plants and Flowers", "Our Body and Health", "Days, Months and Seasons", "Transport and Communication", "Community Helpers", "India – National Symbols", "Festivals of India", "Sports and Games"],
  "Class 2": ["Animal Kingdom", "World of Plants", "Food and Nutrition", "Our Neighbourhood", "Transport and Communication", "Water and Air", "Famous Places of India", "National Symbols and Leaders", "Festivals and Celebrations", "Sports and Games"],
  "Class 3": ["Living and Non-Living Things", "Amazing Animals", "Plants and Trees", "Human Body and Health", "Our Earth and Sky", "Inventions and Discoveries", "India – States and Capitals", "Great Indians", "Sports World", "Current Affairs"],
  "Class 4": ["Animal World", "Plant Life", "Science Around Us", "Our Solar System", "India – Geography and Monuments", "Madhya Pradesh – Our State", "Famous Personalities", "Books and Authors", "Sports and Games", "Current Affairs"],
  "Class 5": ["Wonders of Nature", "Science and Inventions", "Space and the Solar System", "India – History and Heritage", "Madhya Pradesh – Our State", "Our Constitution and Government", "World – Countries and Capitals", "Famous Personalities", "Sports and Awards", "Current Affairs"],
  "Class 6": ["Plant and Animal World", "Human Body and Health", "Science and Technology", "Our Earth and Environment", "Indian History and Culture", "Indian Polity and Constitution", "Madhya Pradesh – Our State", "World Geography", "Sports, Books and Awards", "Current Affairs"],
  "Class 7": ["Life Science", "Physical Science Around Us", "Computers and Technology", "Environment and Conservation", "Indian History – Medieval India", "Indian Constitution and Government", "Indian Geography and Economy", "World – Organisations and Places", "Sports, Books and Awards", "Current Affairs"],
  "Class 8": ["Science in Daily Life", "Space Research and ISRO", "Computers, Internet and Cyber Safety", "Environment and Climate", "Indian History – Freedom Struggle", "Indian Polity and Rights", "Indian Economy and Geography", "World Affairs and Organisations", "Sports, Books, Awards and Personalities", "Current Affairs"],
};

const DRAWING: Record<MinorClass, string[]> = {
  Nursery: ["Pre-Drawing Strokes (Standing, Sleeping and Slanting Lines)", "Curves and Circles", "Join the Dots", "Colouring Within Lines", "Colouring Fruits and Vegetables", "Colouring Animals", "Finger and Thumb Printing", "Free Hand Scribbling"],
  LKG: ["Lines and Curves", "Basic Shapes – Circle, Square, Triangle", "Join the Dots and Complete", "Colouring Fruits and Flowers", "Colouring Animals and Birds", "Drawing with Shapes", "Thumb and Leaf Printing", "Free Hand Drawing"],
  UKG: ["Drawing with Shapes", "Complete the Picture", "Fruits and Vegetables", "Animals and Birds", "Flowers and Trees", "My House", "Vehicles", "Colouring with Crayons"],
  "Class 1": ["Lines, Shapes and Patterns", "Complete the Half Picture", "Fruits and Vegetables", "Animals and Birds", "Flowers and Trees", "House and Hut", "Vehicles", "Simple Scenery", "Colouring with Crayons"],
  "Class 2": ["Patterns and Borders", "Drawing with Shapes", "Fruits and Vegetables", "Animals and Birds", "Flowers and Plants", "Vehicles", "Kites, Balloons and Toys", "Simple Scenery", "Colouring and Shading"],
  "Class 3": ["Patterns and Borders", "Object Drawing – Things at Home", "Animals and Birds", "Flowers and Leaves", "Vehicles", "Scenery – Village and River", "Festival Drawing", "Cartoon Characters", "Crayon Shading"],
  "Class 4": ["Borders and Designs", "Object Drawing", "Animals and Birds", "Nature – Trees and Flowers", "Scenery – Mountains and Sunset", "Festival and Celebration Scenes", "Human Figures – Basic", "Rangoli Designs", "Colour Shading"],
  "Class 5": ["Borders and Geometric Designs", "Object Drawing and Still Life", "Animals and Birds", "Nature and Scenery", "Human Figures in Action", "Festival and Fair Scenes", "Rangoli and Mandala Designs", "Poster on Cleanliness", "Water Colour Basics"],
  "Class 6": ["Geometric and Floral Designs", "Still Life – Pots and Fruits", "Light and Shade", "Nature Study", "Human Figures and Faces", "Composition – Market or Fair Scene", "Poster Making – Social Messages", "Folk Art – Gond and Warli", "Colour Wheel and Mixing"],
  "Class 7": ["Design and Pattern", "Still Life with Shading", "Perspective Basics", "Landscape Painting", "Human Figure Composition", "Memory Drawing", "Poster Making", "Folk Art of India", "Lettering and Calligraphy"],
  "Class 8": ["Design – Geometric and Floral", "Still Life with Light and Shade", "One-Point Perspective", "Landscape and Seascape", "Human Figure Composition", "Memory and Imaginative Drawing", "Poster Making – Social Awareness", "Indian Folk Art – Madhubani, Gond and Warli", "Lettering and Logo Design"],
};

const slug = (className: string) => className.toLowerCase().replace(/\s+/g, "-");

function preset(className: MinorClass, subject: "General Knowledge" | "Drawing", topics: string[]): StandardCurriculumPreset {
  return {
    id: `school-${subject === "Drawing" ? "drawing" : "gk"}-${slug(className)}`,
    title: `${subject} – ${className} (school topics)`,
    className,
    subject,
    board: SCHOOL,
    description: `${subject} topics for ${className}. No textbook: edit the topics to match what is taught.`,
    chapters: topics.map((title, i) => ({ number: i + 1, title })),
  };
}

export const MINOR_SUBJECT_BOOK_PRESETS: StandardCurriculumPreset[] = MINOR_SUBJECT_CLASSES.flatMap((c) => [
  preset(c, "General Knowledge", GK[c]),
  preset(c, "Drawing", DRAWING[c]),
]);
