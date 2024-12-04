class Comments {
    static async renderComments(comments, parentElement) {
        for (const reply of comments) {
            const { author, record: { text, createdAt } } = reply.post;
            let content = text;
            const formattedDate = new Date(createdAt).toLocaleString();
            // Process facets to embed links and mentions
            const facets = reply.post.record.facets || [];
            facets.sort((a, b) => a.index.byteStart - b.index.byteStart); // Ensure facets are in order

            let offset = 0;
            facets.forEach(facet => {
                const start = facet.index.byteStart + offset;
                const end = facet.index.byteEnd + offset;
                const originalText = content.slice(start, end);
                let replacementText = originalText;

                facet.features.forEach(feature => {
                    if (feature.$type === 'app.bsky.richtext.facet#link') {
                        replacementText = `<a class="link" href="${feature.uri}" target="_blank" rel="noopener noreferrer">${originalText}</a>`;
                    } else if (feature.$type === 'app.bsky.richtext.facet#mention') {
                        replacementText = `<a class="link" href="https://bsky.app/profile/${feature.did}" target="_blank" rel="noopener noreferrer">${originalText}</a>`;
                    }
                });

                content = content.slice(0, start) + replacementText + content.slice(end);
                offset += replacementText.length - originalText.length;
            });
            const safeContent = DOMPurify.sanitize(content); // Sanitize the content
            const commentBody = `
                <div class="comment-container">
                    <img src="${author.avatar}" alt="${author.displayName}'s avatar" class="comment-avatar">
                    <div class="comment-details">
                        <div class="comment-header">
                            <a href="https://bsky.app/profile/${author.did}" target="_blank" class="username-link">${author.displayName}</a>
                            <span class="comment-handle">@${author.handle}</span>
                            <div class="comment-timestamp">${formattedDate}</div>
                        </div>
                        <div class="comment-text">${safeContent}</div>
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

    static async load(username, threadId) {
        commentsLoaded = true;
        const commentList = document.getElementById('comments');
        commentList.innerHTML = "Loading comments...";
        try {
            const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${username}/app.bsky.feed.post/${threadId}&depth=10`);
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

let commentsLoaded = false;
const args = document.currentScript.dataset;
document.addEventListener('scroll', function() {
    const commentList = document.getElementById('comments');
    if (isInViewport(commentList) && !commentsLoaded)
        Comments.load(args.username, args.threadid)
});

