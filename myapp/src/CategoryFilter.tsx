import type { T } from "./i18n.ts";

type Category = { slug: string; key: string };

type Props = {
  categories: Category[];
  active: string;
  onChange: (slug: string) => void;
  t: T;
};

export default function CategoryFilter({ categories, active, onChange, t }: Props) {
  return (
    <div className="bw-categories">
      {categories.map((cat) => (
        <button
          key={cat.slug}
          className={`bw-cat-btn ${active === cat.slug ? "bw-cat-active" : ""}`}
          onClick={() => onChange(cat.slug)}
        >
          {t.categories[cat.key as keyof typeof t.categories]}
        </button>
      ))}
    </div>
  );
}
