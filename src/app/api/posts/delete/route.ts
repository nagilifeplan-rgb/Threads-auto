import { NextRequest, NextResponse } from 'next/server';
import { deletePost, getPost, updatePost } from '@/lib/store';

// DELETE: cancel / delete a post
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const post = getPost(id);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Cancel pending posts (mark as cancelled), remove others
  if (post.status === 'pending') {
    updatePost(id, { status: 'cancelled' });
    return NextResponse.json({ success: true, action: 'cancelled' });
  }

  deletePost(id);
  return NextResponse.json({ success: true, action: 'deleted' });
}
