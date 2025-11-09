# DocWranger / DocETL tests

DocWrangler / DocETL are data processing tools written by Shreya. At first glance they look super powerful. It's taking a bit of time figuring out how to use them though.

## How to use
1. GoTo [DocWranger Playground](https://www.docetl.org/playground)
2. File->New (exist out of the dialog box that pops up)
3. Edit->Edit API Keys to add your OpenAI API key
4. Upload the two otterai files from scratch/MISC_DATASETS
5. Click the Load from YAML icon and load the vendor-policy-risk-categorizer.yaml file
  5.1 As of this writing there's a bug in how the loader handles slipt componets. Fix this by deleting all the Method Args except for "delimiter" and type ## for the value (this tells the pipeline to split the input documents  on level 2 markdown headings)
6. Click Run Fresh

## Notes
The pipeline runs much faster locally. Follow DocETL's [instructions](https://github.com/ucbepic/docetl) to install on your computer.

## Helpful links:
- https://www.youtube.com/watch?v=wtw9a2VlMTI
- https://www.docetl.org/
- https://data-people-group.github.io/blogs/2025/01/13/docwrangler/
