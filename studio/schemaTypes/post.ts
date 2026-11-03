import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 2,
      description: 'Short summary shown on the blog index and in meta tags (≈160 characters).',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'mainImage',
      title: 'Cover image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'object',
      fields: [
        defineField({name: 'name', title: 'Name', type: 'string'}),
        defineField({
          name: 'avatar',
          title: 'Avatar',
          type: 'image',
          options: {hotspot: true},
        }),
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'faq',
      title: 'FAQ',
      type: 'array',
      description:
        'Shown at the bottom of the post and automatically marked up as FAQPage schema for Google rich results.',
      of: [
        defineField({
          name: 'faqItem',
          title: 'Question',
          type: 'object',
          fields: [
            defineField({
              name: 'question',
              title: 'Question',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'answer',
              title: 'Answer',
              type: 'text',
              rows: 3,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {title: 'question', subtitle: 'answer'},
          },
        }),
      ],
      options: {
        layout: 'list',
      },
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      description: 'Optional search engine overrides. Leave blank to use the title, excerpt and cover image.',
      options: {
        collapsible: true,
        collapsed: true,
      },
      fields: [
        defineField({
          name: 'metaTitle',
          title: 'Meta title',
          type: 'string',
          description: 'Shown in Google results. Keep under 60 characters.',
          validation: (rule) => rule.max(70),
        }),
        defineField({
          name: 'metaDescription',
          title: 'Meta description',
          type: 'text',
          rows: 2,
          description: 'Shown under the title in Google results. Keep under 160 characters.',
          validation: (rule) => rule.max(170),
        }),
        defineField({
          name: 'ogImage',
          title: 'Social share image',
          type: 'image',
          options: {hotspot: true},
          description: 'Used for WhatsApp/Facebook shares. Defaults to the cover image.',
        }),
      ],
    }),
  ],

  preview: {
    select: {
      title: 'title',
      subtitle: 'publishedAt',
      media: 'mainImage',
    },
    prepare({title, subtitle, media}) {
      const date = subtitle ? new Date(subtitle).toLocaleDateString('en-IN') : undefined
      return {title, subtitle: date, media}
    },
  },
})
