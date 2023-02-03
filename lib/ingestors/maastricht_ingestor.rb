require 'open-uri'
require 'csv'

module Ingestors
  class MaastrichtIngestor < Ingestor
    def self.config
      {
        key: 'maastricht_event',
        title: 'Maastricht Events API',
        category: :events
      }
    end

    def read(url)
      begin
        process_maastricht(url)
      rescue Exception => e
        @messages << "#{self.class.name} failed with: #{e.message}"
      end

      # finished
      nil
    end

    private

    def process_maastricht(url)
      4.times.each do |i| # always check the first 4 pages, # of pages could be increased if needed
        sleep(1)
        event_links = Nokogiri::HTML5.parse(URI.open("#{url}?_page=#{i+1}")).css('.pt-cv-page h3 > a')
        return if event_links.empty?

        event_links.each do |event_link|
          event_url = event_link.attributes['href']

          event = Event.new

          ical_event = Icalendar::Event.parse(URI.open("#{event_url}/ical/").set_encoding('utf-8')).first
          event.title = ical_event.summary
          event.description = convert_description ical_event.description
          event.url = ical_event.url
          # TeSS timezone handling is a bit special.
          # remove the timezone shift since else TeSS will shift it too much
          event.start = ical_event.dtstart.to_s.split[0,2].join(' ').to_time
          event.end = ical_event.dtend.to_s.split[0,2].join(' ').to_time
          event.set_default_times
          event.venue = ical_event.try(:location)&.split(',')&.first
          event.city = 'Maastricht'
          event.event_types = "workshops_and_courses" #ical_event.categories # these event types are quite verbose and most are workshops
          # see https://www.openscience-maastricht.nl/wp-sitemap-taxonomies-event-categories-1.xml 
          event.timezone = 'Europe/Amsterdam' # how to get this from Icalendar Event object?

          event.source = 'Maastricht University'

          add_event(event)
          @ingested += 1
        rescue Exception => e
          @messages << "Extract event fields failed with: #{e.message} for #{event_url}"
          Sentry.capture_exception(e)
        end
      end
    end
  end
end
