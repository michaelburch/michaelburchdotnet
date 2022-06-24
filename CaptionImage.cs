using System.Collections.Generic;
using System.IO;
using System.Xml.Linq;
using System.Net;
using System.Net.Http;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Statiq.Common;

namespace michaelburchdotnet
{
    class CaptionImage : SyncShortcode
    {
        
        private const string Src = nameof(Src);
        private const string Style = nameof(Style);
        private const string AltText = nameof(AltText);

        public override ShortcodeResult Execute(KeyValuePair<string, string>[] args, string content, IDocument document, IExecutionContext context)
        {
            IMetadataDictionary arguments = args.ToDictionary(
                Src,
                Style,
                AltText);
            
            var style = arguments.GetString(Style) ?? "container";
            var altText = arguments.GetString(AltText) ?? "content";

            XElement container = new XElement(
                "div",
                new XAttribute("class",style));

            XElement figure = new XElement(
                "figure");
          
            // Image
            XElement image = arguments.XElement("img", Src, x => new[]
            {
                new XAttribute("src", context.GetLink(x)),
                new XAttribute("alt", altText)
            });
 
            if (image is object)
            {
                figure.Add(image);
            }

            // Caption
            if (content is object)
            {
                figure.Add(new XElement("figcaption", content));
            }
            container.Add(figure);

            return container.ToString();
        }
    }
    
}