import { useState, useEffect } from 'react';

const STORAGE_KEY = 'pricing-studio-quotes';

export function useQuotes() {
  const [quotes, setQuotes] = useState(() => {
    // Load from localStorage immediately for fast initial render
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch from server on mount
  useEffect(() => {
    async function fetchQuotes() {
      try {
        const res = await fetch('/api/quotes');
        if (!res.ok) throw new Error('Failed to fetch quotes');

        const { quotes: serverQuotes } = await res.json();

        // Update both state and localStorage
        setQuotes(serverQuotes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverQuotes));
        setError(null);
      } catch (err) {
        console.error('Failed to sync quotes:', err);
        setError('Using offline data');
      } finally {
        setLoading(false);
      }
    }

    fetchQuotes();
  }, []);

  // Auto-sync to localStorage on changes (write-through cache)
  useEffect(() => {
    if (quotes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    }
  }, [quotes]);

  const addQuote = async (quote) => {
    // Optimistic update
    const newQuotes = [quote, ...quotes];
    setQuotes(newQuotes);

    // Sync to server
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quote),
      });

      if (!res.ok) throw new Error('Failed to save quote');

      const { quote: savedQuote } = await res.json();

      // Update with server response (in case of transformations)
      setQuotes(prev => prev.map(q => q.id === quote.id ? savedQuote : q));
      setError(null);
    } catch (err) {
      console.error('Failed to save quote:', err);
      setError('Saved locally only');
    }
  };

  const updateQuote = async (id, updates) => {
    // Optimistic update
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));

    // Sync to server
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update quote');

      const { quote: updatedQuote } = await res.json();
      setQuotes(prev => prev.map(q => q.id === id ? updatedQuote : q));
      setError(null);
    } catch (err) {
      console.error('Failed to update quote:', err);
      setError('Updated locally only');
    }
  };

  const deleteQuote = async (id) => {
    // Optimistic update
    setQuotes(prev => prev.filter(q => q.id !== id));

    // Sync to server
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete quote');
      setError(null);
    } catch (err) {
      console.error('Failed to delete quote:', err);
      setError('Deleted locally only');
    }
  };

  return {
    quotes,
    setQuotes, // For bulk operations (like test data import)
    addQuote,
    updateQuote,
    deleteQuote,
    loading,
    error,
  };
}
