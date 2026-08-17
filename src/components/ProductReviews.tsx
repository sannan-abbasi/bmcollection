import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Star, Send } from 'lucide-react';

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  async function fetchReviews() {
    setLoading(true);
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    setReviews(data ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert([
      {
        product_id: productId,
        user_name: name,
        rating,
        comment,
      },
    ]);

    if (!error) {
      setName('');
      setComment('');
      setRating(5);
      fetchReviews();
    }
    setSubmitting(false);
  }

  const averageRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 'No ratings yet';

  return (
    <div className="mt-16 border-t border-stone-200 pt-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10">
        <div>
          <h3 className="font-serif text-3xl text-ink mb-2">Customer Reviews</h3>
          <div className="flex items-center gap-2 text-stone-600">
            <div className="flex text-gold">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.round(Number(averageRating) || 0) ? 'fill-gold' : ''}`} />
              ))}
            </div>
            <span className="text-sm font-medium">{averageRating} ({reviews.length} reviews)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Reviews List */}
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4">
          {loading ? (
            <p className="text-stone-500 text-sm">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-stone-500 text-sm">Be the first to review this product!</p>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="bg-stone-50 p-6 rounded-xl border border-stone-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-ink">{rev.user_name}</span>
                  <div className="flex text-gold">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < rev.rating ? 'fill-gold' : ''}`} />
                    ))}
                  </div>
                </div>
                <p className="text-stone-600 text-sm leading-relaxed">{rev.comment}</p>
                <span className="text-[10px] text-stone-400 mt-3 block">{new Date(rev.created_at).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>

        {/* Add Review Form */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm">
          <h4 className="font-serif text-xl text-ink mb-4">Leave a Review</h4>
          
          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest text-stone-600 mb-2">Your Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm text-ink focus:outline-none focus:border-gold"
              placeholder="e.g. Sarah Jenkins"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest text-stone-600 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setRating(num)}
                  className={`p-2 rounded-lg border transition-colors ${rating >= num ? 'bg-gold/10 border-gold text-gold' : 'border-stone-200 text-stone-400'}`}
                >
                  <Star className={`h-5 w-5 ${rating >= num ? 'fill-gold' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-widest text-stone-600 mb-2">Review Comment</label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm text-ink focus:outline-none focus:border-gold resize-none"
              placeholder="What did you think of the quality, fit, or craftsmanship?"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gold text-cream py-3.5 text-xs uppercase tracking-widest hover:bg-gold-dark transition-colors flex items-center justify-center gap-2 rounded-lg"
          >
            {submitting ? 'Submitting...' : <>Submit Review <Send className="h-3.5 w-3.5" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}