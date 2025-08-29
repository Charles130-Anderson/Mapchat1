import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { MessageCircle, Send, X, Download } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface Comment {
  id: string;
  comment_text: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  sentiment_category?: string;
  sentiment_confidence?: number;
}

interface CommentsPanelProps {
  featureId: string;
  featureCoordinates?: any;
  featureGeometry?: any;
  isVisible: boolean;
  onClose: () => void;
  userTier?: string;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({
  featureId,
  featureCoordinates,
  featureGeometry,
  isVisible,
  onClose,
  userTier = 'free'
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPro = userTier === 'pro';

  useEffect(() => {
    if (isVisible && featureId) {
      fetchComments();
    }
  }, [isVisible, featureId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('comments', {
        body: { feature_id: featureId },
        method: 'GET'
      });

      if (error) throw error;
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to add comments',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('comments', {
        body: {
          comment_text: newComment.trim(),
          feature_id: featureId,
          feature_coordinates: featureCoordinates,
          feature_geometry: featureGeometry,
        },
      });

      if (error) throw error;

      setNewComment('');
      await fetchComments(); // Refresh comments
      toast({
        title: 'Comment added',
        description: isPro ? 'Sentiment analysis will be processed shortly' : 'Comment saved successfully',
      });
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'Positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'Negative': return 'bg-red-100 text-red-800 border-red-200';
      case 'Neutral': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const exportComments = async () => {
    if (!isPro) {
      toast({
        title: 'Pro feature',
        description: 'Upgrade to export comments',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('export-comments');
      
      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spatial-comments-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: 'Comments exported to CSV file',
      });
    } catch (error) {
      console.error('Error exporting comments:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export comments',
        variant: 'destructive',
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <CardTitle>Feature Comments</CardTitle>
            <Badge variant="outline" className="text-xs">
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isPro && (
              <Button variant="outline" size="sm" onClick={exportComments}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Comments List */}
          <ScrollArea className="h-[400px] w-full">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No comments yet. Be the first to add one!
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment, index) => (
                  <div key={comment.id}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm leading-relaxed flex-1">
                          {comment.comment_text}
                        </p>
                        {isPro && comment.sentiment_category && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getSentimentColor(comment.sentiment_category)}`}
                          >
                            {comment.sentiment_category}
                            {comment.sentiment_confidence && (
                              <span className="ml-1">
                                ({Math.round(comment.sentiment_confidence * 100)}%)
                              </span>
                            )}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDistance(new Date(comment.created_at), new Date(), { addSuffix: true })}</span>
                        {comment.user_id === user?.id && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                    </div>
                    {index < comments.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Add Comment Section */}
          <div className="space-y-3 pt-4 border-t">
            <Textarea
              placeholder={user ? "Add your comment or opinion about this feature..." : "Please sign in to add comments"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={!user}
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {isPro && user && (
                  <span className="text-green-600 font-medium">
                    ✨ Pro: Sentiment analysis enabled
                  </span>
                )}
              </div>
              <Button 
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting || !user}
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommentsPanel;