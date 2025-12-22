/**
 * Content Extractor
 * Extracts article content, comments, and user-generated content
 */

import type { Page } from 'puppeteer';
import * as cheerio from 'cheerio';

export interface ExtractedContent {
  title?: string;
  article?: {
    text: string;
    html: string;
    author?: string;
    date?: string;
    tags?: string[];
  };
  comments?: Array<{
    author?: string;
    text: string;
    date?: string;
    replies?: Array<{ author?: string; text: string; date?: string }>;
  }>;
  userGenerated?: Array<{
    type: string;
    content: string;
    author?: string;
    date?: string;
  }>;
}

/**
 * Content Extractor class
 */
export class ContentExtractor {
  /**
   * Extracts main article content
   */
  async extractArticleContent(page: Page): Promise<ExtractedContent['article'] | null> {
    const html = await page.content();
    const $ = cheerio.load(html);
    
    // Try multiple selectors for article content
    const articleSelectors = [
      'article',
      '[role="article"]',
      '.article',
      '.post',
      '.entry-content',
      '.content',
      'main article',
      '#article',
      '#content article',
    ];
    
    let articleElement: cheerio.Cheerio<any> | null = null;
    for (const selector of articleSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        articleElement = element;
        break;
      }
    }
    
    if (!articleElement || articleElement.length === 0) {
      return null;
    }
    
    // Remove navigation, ads, and other non-content elements
    articleElement.find('nav, .nav, .navigation, .sidebar, .ad, .advertisement, .ads, script, style').remove();
    
    const text = articleElement.text().trim();
    const htmlContent = articleElement.html() || '';
    
    // Extract metadata
    const author = articleElement.find('[rel="author"], .author, .byline').first().text().trim() ||
                   $('meta[name="author"]').attr('content') ||
                   $('[itemprop="author"]').text().trim();
    
    const date = articleElement.find('time, .date, .published, [itemprop="datePublished"]').first().attr('datetime') ||
                 articleElement.find('time, .date, .published, [itemprop="datePublished"]').first().text().trim() ||
                 $('meta[property="article:published_time"]').attr('content');
    
    const tags: string[] = [];
    articleElement.find('[rel="tag"], .tag, .tags a, [itemprop="keywords"]').each((_: number, el: any) => {
      const tag = $(el).text().trim();
      if (tag) {
        tags.push(tag);
      }
    });
    
    if (!text || text.length < 50) {
      return null; // Not enough content
    }
    
    return {
      text,
      html: htmlContent,
      author: author || undefined,
      date: date || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };
  }
  
  /**
   * Extracts comments
   */
  async extractComments(page: Page): Promise<ExtractedContent['comments']> {
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const comments: ExtractedContent['comments'] = [];
    
    // Try multiple selectors for comments
    const commentSelectors = [
      '.comment',
      '[class*="comment"]',
      '.comment-item',
      '.comment-list li',
      '[data-comment-id]',
      'article.comment',
    ];
    
    for (const selector of commentSelectors) {
      $(selector).each((_, el) => {
        const $comment = $(el);
        const text = $comment.find('.comment-text, .comment-content, .comment-body, p').text().trim();
        
        if (!text || text.length < 10) {
          return; // Skip empty or very short comments
        }
        
        const author = $comment.find('.comment-author, .author, [itemprop="author"]').text().trim() ||
                      $comment.find('.comment-meta .author').text().trim();
        
        const date = $comment.find('time, .date, .comment-date').attr('datetime') ||
                    $comment.find('time, .date, .comment-date').text().trim();
        
        const replies: Array<{ author?: string; text: string; date?: string }> = [];
        $comment.find('.reply, .comment-reply, .child-comment').each((_, replyEl) => {
          const $reply = $(replyEl);
          const replyText = $reply.find('.comment-text, .comment-content, p').text().trim();
          if (replyText) {
            replies.push({
              author: $reply.find('.author, .comment-author').text().trim() || undefined,
              text: replyText,
              date: $reply.find('time, .date').attr('datetime') || $reply.find('time, .date').text().trim() || undefined,
            });
          }
        });
        
        comments.push({
          author: author || undefined,
          text,
          date: date || undefined,
          replies: replies.length > 0 ? replies : undefined,
        });
      });
      
      if (comments.length > 0) {
        break; // Found comments, stop trying other selectors
      }
    }
    
    return comments;
  }
  
  /**
   * Extracts user-generated content (reviews, ratings, etc.)
   */
  async extractUserGeneratedContent(page: Page): Promise<ExtractedContent['userGenerated']> {
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const userContent: ExtractedContent['userGenerated'] = [];
    
    // Extract reviews
    $('[itemtype*="Review"], .review, [class*="review"]').each((_, el) => {
      const $review = $(el);
      const text = $review.find('[itemprop="reviewBody"], .review-text, .review-content').text().trim();
      if (text) {
        userContent.push({
          type: 'review',
          content: text,
          author: $review.find('[itemprop="author"], .review-author').text().trim() || undefined,
          date: $review.find('[itemprop="datePublished"], time').attr('datetime') || undefined,
        });
      }
    });
    
    // Extract ratings
    $('[itemtype*="Rating"], .rating, [class*="rating"]').each((_, el) => {
      const $rating = $(el);
      const value = $rating.find('[itemprop="ratingValue"], .rating-value').text().trim();
      const text = $rating.find('.rating-text, .rating-comment').text().trim();
      if (value || text) {
        userContent.push({
          type: 'rating',
          content: value ? `${value} - ${text}` : text,
          author: $rating.find('[itemprop="author"], .author').text().trim() || undefined,
        });
      }
    });
    
    // Extract testimonials
    $('[itemtype*="Testimonial"], .testimonial, [class*="testimonial"]').each((_, el) => {
      const $testimonial = $(el);
      const text = $testimonial.find('[itemprop="text"], .testimonial-text, .testimonial-content').text().trim();
      if (text) {
        userContent.push({
          type: 'testimonial',
          content: text,
          author: $testimonial.find('[itemprop="author"], .testimonial-author').text().trim() || undefined,
        });
      }
    });
    
    return userContent;
  }
  
  /**
   * Extracts all content from a page
   */
  async extractAllContent(page: Page): Promise<ExtractedContent> {
    const [article, comments, userGenerated] = await Promise.all([
      this.extractArticleContent(page),
      this.extractComments(page),
      this.extractUserGeneratedContent(page),
    ]);
    
    // Extract title
    const title = await page.title();
    
    return {
      title: title || undefined,
      article: article || undefined,
      comments: (comments && comments.length > 0) ? comments : undefined,
      userGenerated: (userGenerated && userGenerated.length > 0) ? userGenerated : undefined,
    };
  }
}

