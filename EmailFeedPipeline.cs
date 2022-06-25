using System;
using System.Linq;
using Statiq.Common;
using Statiq.Core;
using Statiq.Feeds;
using Statiq.Web.Modules;

namespace Statiq.Web.Pipelines
{
    public class EmailFeedPipeline : Pipeline
    {
        public EmailFeedPipeline()
        {
            Dependencies.AddRange(nameof(Inputs), nameof(Content), nameof(Archives), nameof(Data));

            ProcessModules = new ModuleList
            {
                new GetPipelineDocuments(ContentType.Data),

                // Filter to feeds
                new FilterDocuments(Config.FromDocument(IsFeed)),

                // Generate the feeds
                new ForEachDocument
                {
                    new ExecuteConfig(Config.FromDocument(feedDoc =>
                    {
                        ModuleList modules = new ModuleList();

                        // Get outputs from the pipeline(s)
                        modules.Add(
                            new ReplaceDocuments(feedDoc.GetList(WebKeys.FeedPipelines, new[] { nameof(Content) }).ToArray()),
                            new ProcessShortcodes(),
                            new MergeMetadata(Config.FromValue(feedDoc.Yield())).KeepExisting());

                        // Filter by document source
                        if (feedDoc.ContainsKey(WebKeys.FeedSources))
                        {
                            modules.Add(new FilterSources(feedDoc.GetList<string>(WebKeys.FeedSources)));
                        }

                        // Filter by metadata
                        if (feedDoc.ContainsKey(WebKeys.FeedFilter))
                        {
                            modules.Add(new FilterDocuments(Config.FromDocument(doc => doc.GetBool(WebKeys.FeedFilter))));
                        }

                        // Order the documents
                        if (feedDoc.ContainsKey(WebKeys.FeedOrderKey))
                        {
                            modules.Add(
                                new OrderDocuments(feedDoc.GetString(WebKeys.FeedOrderKey))
                                    .Descending(feedDoc.GetBool(WebKeys.FeedOrderDescending)));
                        }

                        // Generate the feed(s)
                        GenerateFeeds generateFeeds = new GenerateFeeds()
                            .WithRssPath("feed/index.xml")
                            .WithAtomPath("feed/feed.atom")
                            .WithFeedId(feedDoc.GetString(WebKeys.FeedId))
                            .WithFeedTitle(feedDoc.GetString(WebKeys.FeedTitle))
                            .WithFeedDescription(feedDoc.GetString(WebKeys.FeedDescription))
                            .WithFeedAuthor(feedDoc.GetString(WebKeys.FeedAuthor))
                            .WithFeedPublished(feedDoc.ContainsKey(WebKeys.FeedPublished) ? feedDoc.GetDateTime(WebKeys.FeedPublished) : (DateTime?)null)
                            .WithFeedUpdated(feedDoc.ContainsKey(WebKeys.FeedUpdated) ? feedDoc.GetDateTime(WebKeys.FeedUpdated) : (DateTime?)null)
                            .WithFeedLink(feedDoc.Get<Uri>(WebKeys.FeedLink))
                            .WithFeedImageLink(feedDoc.Get<Uri>(WebKeys.FeedImageLink))
                            .WithFeedCopyright(feedDoc.GetString(WebKeys.Copyright));
                            

                        // Set the per-item delegates (these would have been copied down to each document from the feed document in the MergeMetadata up above)
                        if (feedDoc.ContainsKey(WebKeys.FeedItemId))
                        {
                            generateFeeds = generateFeeds.WithItemId(Config.FromDocument(doc => doc.GetString(WebKeys.FeedItemId)));
                        }
                        if (feedDoc.ContainsKey(WebKeys.FeedItemTitle))
                        {
                            generateFeeds = generateFeeds.WithItemTitle(Config.FromDocument(doc => doc.GetString(WebKeys.FeedItemTitle)));
                        }

                            generateFeeds = generateFeeds.WithItemDescription(Config.FromDocument(doc => doc.GetString("Excerpt",WebKeys.FeedItemDescription)));
                        

                        if (feedDoc.ContainsKey(WebKeys.FeedItemAuthor))
                        {
                            generateFeeds = generateFeeds.WithItemAuthor(Config.FromDocument(doc => doc.GetString(WebKeys.FeedItemAuthor)));
                        }
                        if (feedDoc.ContainsKey(WebKeys.FeedItemPublished))
                        {
                            generateFeeds = generateFeeds.WithItemPublished(Config.FromDocument(doc => doc.Get<DateTime?>(WebKeys.FeedItemPublished)));
                        }
                        if (feedDoc.ContainsKey(WebKeys.FeedItemUpdated))
                        {
                            generateFeeds = generateFeeds.WithItemUpdated(Config.FromDocument(doc => doc.Get<DateTime?>(WebKeys.FeedItemUpdated)));
                        }
                        if (feedDoc.ContainsKey(WebKeys.FeedItemLink))
                        {
                            //generateFeeds = generateFeeds.WithItemLink(Config.FromDocument(doc => doc.Get<Uri>(WebKeys.FeedItemLink)));
                        }

                        generateFeeds = generateFeeds.WithItemImageLink(Config.FromDocument((doc, ctx) => {
                       
                            return TypeHelper.Convert<Uri>(ctx.GetLink(doc, "Card", true)) ??  TypeHelper.Convert<Uri>(ctx.GetLink("/images/ogcard.jpeg", true)) ;
                        }
                        ));
                        
                        if (feedDoc.ContainsKey(WebKeys.FeedItemContent))
                        {
                            generateFeeds = generateFeeds.WithItemContent(Config.FromDocument(doc => doc.GetString(WebKeys.FeedItemContent)));
                        }
                        if (feedDoc.ContainsKey(WebKeys.FeedItemThreadLink))
                        {
                            generateFeeds = generateFeeds.WithItemThreadLink(Config.FromDocument(doc => doc.Get<Uri>(WebKeys.FeedItemThreadLink)));
                        }
                        if (feedDoc.ContainsKey(WebKeys.FeedItemThreadCount))
                        {
                            generateFeeds = generateFeeds.WithItemThreadCount(Config.FromDocument(doc => doc.GetInt(WebKeys.FeedItemThreadCount)));
                        }
                        if (feedDoc.ContainsKey(WebKeys.FeedItemThreadUpdated))
                        {
                            generateFeeds = generateFeeds.WithItemThreadUpdated(Config.FromDocument(doc => doc.Get<DateTime?>(WebKeys.FeedItemThreadUpdated)));
                        }

                        modules.Add(generateFeeds);
                        return modules;
                    }))
                }
            };

            OutputModules = new ModuleList
            {
                new FilterDocuments(Config.FromDocument(WebKeys.ShouldOutput, true)),
                new WriteFiles()
            };
        }

        public static bool IsFeed(IDocument document) =>
            document.ContainsKey(WebKeys.FeedRss);
    }
}