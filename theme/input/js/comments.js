class Comments {
    static async renderComments(comments, parentElement) {
        for (const reply of comments) {
            const { author, record: { text: content, createdAt } } = reply.post;
            const formattedDate = new Date(createdAt).toLocaleString();
            const commentBody = `
                <div class="comment-container">
                    <img src="${author.avatar}" alt="${author.displayName}'s avatar" class="comment-avatar">
                    <div class="comment-details">
                        <div class="comment-header">
                            <a href="https://bsky.app/profile/${author.did}" target="_blank" class="username-link">${author.displayName}</a>
                            <span class="comment-handle">@${author.handle}</span>
                            <div class="comment-timestamp">${formattedDate}</div>
                        </div>
                        <div class="comment-text">${content}</div>
                    </div>
                </div>`;
            
            const commentElement = document.createElement("div");
            commentElement.classList.add("comment");
            commentElement.innerHTML = commentBody;
            parentElement.appendChild(commentElement);

            // Render child comments recursively
            if (reply.replies && reply.replies.length > 0) {
                const childContainer = document.createElement("div");
                childContainer.classList.add("child-comments");
                commentElement.appendChild(childContainer);
                await Comments.renderComments(reply.replies, childContainer);
            }
        }
    }

    static async load() {
        const commentList = document.getElementById('comments');
        commentList.innerHTML = "Loading comments...";
        try {
            const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://michaelburch.net/app.bsky.feed.post/3lcer3vg6522k&depth=10`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            const replies = data.thread.replies || [];
            replies.sort((a, b) => new Date(a.post.record.createdAt) - new Date(b.post.record.createdAt)); // Sort by date
            commentList.innerHTML = "";
            await Comments.renderComments(replies, commentList);
        } catch (error) {
            commentList.innerHTML = "";
            console.error('Error fetching comments:', error);
        }
    }
}

function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

document.addEventListener('scroll', function() {
    const commentList = document.getElementById('comments');
    if (isInViewport(commentList) & commentList.childNodes.length === 0)
        Comments.load()
});

