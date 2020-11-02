using System;
using System.Threading.Tasks;
using Statiq.App;
using Statiq.Web;

namespace michaelburchdotnet
{
  public class Program
  {
    public static async Task<int> Main(string[] args) =>
      await Bootstrapper
        .Factory
        .CreateWeb(args)
        .AddShortcode<CaptionImage>()
        .AddShortcode<CaptionImageRight>()
        .AddShortcode<CaptionImageLeft>()
        .RunAsync();
  }
}
