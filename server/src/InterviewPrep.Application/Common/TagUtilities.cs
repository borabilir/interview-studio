namespace InterviewPrep.Application.Common;

internal static class TagUtilities
{
    public static List<string> NormalizeNames(IReadOnlyList<string>? tags)
    {
        var result = new List<string>();
        var seenSlugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var tag in tags ?? [])
        {
            if (string.IsNullOrWhiteSpace(tag))
            {
                continue;
            }

            var name = tag.Trim();
            var slug = Slugify(name);

            if (string.IsNullOrWhiteSpace(slug) || !seenSlugs.Add(slug))
            {
                continue;
            }

            result.Add(name);
        }

        return result;
    }

    public static string Slugify(string value) =>
        string.Join('-', value.Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));
}
