using Statiq.Common;
using Statiq.Core;
using Statiq.Web;
using Statiq.Minification;
using Statiq.Sass;

namespace michaelburchdotnet.Pipelines
{
    public class CookieConsentPipeline : Pipeline
    {
        public CookieConsentPipeline()
        {
            
            Isolated = true;
            ProcessModules = new ModuleList
            {
                new ReadFiles("cookieconsent/main.scss"),
                new CompileSass().WithCompactOutputStyle(),
                new MinifyCss(),
                new SetDestination("assets/css/cookieconsent.min.css")
            };

            

            OutputModules = new ModuleList
            {
                new FilterDocuments(Config.FromDocument(WebKeys.ShouldOutput, true)),
                new WriteFiles()
            };
        }
    }
}