'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { categoriesApi, Category } from '@/lib/api/categories';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getCategoryTree();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) {
      return;
    }

    try {
      const response = await categoriesApi.deleteCategory(id);
      if (response.success) {
        loadCategories();
      } else {
        alert('Failed to delete category');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  const renderCategoryTree = (cats: Category[], level = 0) => {
    return (
      <ul className={`${level > 0 ? 'ml-8 mt-2 border-l-2 border-blue-200 pl-4' : ''}`}>
        {cats.map((category) => (
          <li key={category.id} className="mb-2">
            <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{'📁'.repeat(level + 1)}</span>
                <div>
                  <Link
                    href={`/admin/categories/${category.id}`}
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {category.name}
                  </Link>
                  {category.slug && (
                    <p className="text-xs text-gray-500 mt-1">/{category.slug}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/categories/${category.id}`}
                  className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-50"
                >
                  ✏️ Edit
                </Link>
                <button
                  onClick={() => handleDelete(category.id, category.name)}
                  className="text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
            {category.children && category.children.length > 0 && renderCategoryTree(category.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2">📁 Categories</h1>
            <p className="text-xl text-blue-50">Manage product categories</p>
          </div>
          <Link
            href="/admin/categories/new"
            className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-center"
          >
            ➕ New Category
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        {categories.length > 0 ? (
          renderCategoryTree(categories)
        ) : (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📁</div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-2">No categories found</h2>
            <Link
              href="/admin/categories/new"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ➕ Create First Category
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

