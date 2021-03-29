using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Statiq.App;
using Statiq.Common;
using Statiq.Web;
using Statiq.Core;
using Statiq.Minification;
namespace michaelburchdotnet
{
    class Program
    {
        public static async Task<int> Main(string[] args) =>
        await Bootstrapper
        .Factory
        .CreateWeb(args)
        .AddShortcode<CaptionImage>()
        .AddSetting("LinkHideExtensions", false)
        .ModifyPipeline("Assets", p => p.WithProcessModules
            (
                // Exclude cookieconsent as it has it's own pipeline
                new FilterDocuments(Config.FromDocument(doc => !doc.Source.Parent.FullPath.Contains("cookieconsent"))),
                new SetDestination(Config.FromDocument(
                doc =>
                {
                    // Output folder name should be the same as input folder
                    // and nested under assets
                    var parentFolder = doc.Source.Parent.Segments[doc.Source.Parent.Segments.Length - 1].ToString();
                    // Except for scss
                    if (parentFolder == "scss")
                        parentFolder = "css";
                    // ... and images. Images are not nested under assets to match original structure
                    if (parentFolder == "images")
                        return new NormalizedPath($"./{parentFolder}/{doc.Destination.FileName}");
                    return new NormalizedPath($"./assets/{parentFolder}/{doc.Destination.FileName}");

                }
                )),
                // Conditionally run minification
                new ExecuteIf(Config.FromDocument(doc => doc.Destination.Extension == ".css"))
                {
                    new MinifyCss()
                },
                new ExecuteIf(Config.FromDocument(doc => doc.Destination.Extension == ".js"))
                {
                    new MinifyJs()
                }

            )
        )
        .RunAsync();
    }
}
