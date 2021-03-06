/**
 * Showtime plugin to watch VTele replay TV 
 *
 * Copyright (C) 2014 Anthony Dahanne
 *
 *     This file is part of TV5Video.ca Showtime plugin.
 *
 *  TV5Video.ca Showtime plugin is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  TV5Video.ca Showtime plugin is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with TV5Video.ca Showtime plugin.  If not, see <http://www.gnu.org/licenses/>.
 *
 *  Download from : https://github.com/anthonydahanne/showtime-plugin-tv5video.ca
 *
 */

(function(plugin) {

  var PLUGIN_PREFIX = "vtele.ca:";
  var EMISSIONS_URL = "https://apps.vtele.ca/apiv2/shows/";
 
  // Register a service (will appear on home page)
  var service = plugin.createService("Vtele.ca", PLUGIN_PREFIX+"start", "tv", true, plugin.path + "vtele.png");

   // Add a responder to the registered start URI
  plugin.addURI(PLUGIN_PREFIX+"start", function(page) {
    page.type = "directory";
    page.metadata.title = "VTele.ca shows";

    showtime.trace("Getting emissions list : " + EMISSIONS_URL);

  var getEmissionsResponse = showtime.httpReq(EMISSIONS_URL, {
    debug: false,
    compression: false,
    headers: {
      'Authorization' : 'Basic bWlyZWdvOlJpT25WLzI0XzhXQy1qUy1AJTklUThSSWIhZCNyd1NF'
    },
    postdata: {
      timestamp : '1',
      device : 'android_phone',
      appVersion : '1.2.2.17',
      method : 'get'
    }
  });


    var emissions = showtime.JSONDecode(getEmissionsResponse);
    var allTitles = emissions.data;
    for (var index in allTitles) {
      if (allTitles[index] != null ) {
          page.appendItem(PLUGIN_PREFIX+"emission:"+allTitles[index]["uid"] +":"+ allTitles[index]["nom"], "directory", {
          title: allTitles[index]["nom"]
   	    });
      }
    }
    page.loading = false;
  });

  // Add a responder to the registered emission URI
  plugin.addURI(PLUGIN_PREFIX+"emission:(.*):(.*)", function(page,emissionId,title) {
    page.type = "directory";
    page.metadata.title = title;
    var seasonsUrl = EMISSIONS_URL + emissionId + "/saisons";
    showtime.trace("Getting seasons list : " + seasonsUrl);

    var getSeasonsResponse = showtime.httpReq(seasonsUrl, {
        debug: false,
        compression: false,
        headers: {
          'Authorization' : 'Basic bWlyZWdvOlJpT25WLzI0XzhXQy1qUy1AJTklUThSSWIhZCNyd1NF'
        },
        postdata: {
          timestamp : '1',
          device : 'android_phone',
          appVersion : '1.2.2.17',
          method : 'get'
        }
      });

    var seasons = showtime.JSONDecode(getSeasonsResponse).data;
    var index = 0;
    seasons.forEach(function(season) {
      var seasonUrl = EMISSIONS_URL + emissionId + "/videos/saisons/" + season["uid"];
      var seasonName = season["nom"]
      var getEpisodes = showtime.httpReq(seasonUrl, {
        debug: false,
        compression: false,
        headers: {
          'Authorization' : 'Basic bWlyZWdvOlJpT25WLzI0XzhXQy1qUy1AJTklUThSSWIhZCNyd1NF'
        },
        postdata: {
          timestamp : '1',
          device : 'android_phone',
          appVersion : '1.2.2.17',
          method : 'get'
        }
      });

      var episodes = showtime.JSONDecode(getEpisodes).data;
      episodes.forEach(function(episode){
        // var publish_end = "Disponible jusqu'à : " + episode["publish_end"] +"\n\n";
        var metadata = {
          title: seasonName + " - " + episode["titre"],
          description: episode["description"],
          // year: parseInt(episode["_meta"]["annee_production"]),
          // duration: episode["_meta"]["duree"],
          icon: episode["image"]
        };
        page.appendItem(PLUGIN_PREFIX + "video:" + episode["idBC"], "video", metadata);
      });
     index++;

    });

    page.loading = false;
  });

  plugin.addURI(PLUGIN_PREFIX+"video:(.*)", function(page, idBC) {
    var episodeMetadataUrl = "http://api.brightcove.com/services/library?command=find_video_by_id&video_id="+ idBC +"&token=2sgr1KCsKKJXcqUFQdti_mXZAhdNB-wCFwCbGW6lz5atwI1QTrElxQ..&video_fields=id%2Cname%2ClinkUrl%2CflvUrl%2Crenditions&media_delivery=http";
    showtime.trace("Getting episode metadata before playing : " + episodeMetadataUrl);
    var getEpisodeResponse = showtime.httpGet(episodeMetadataUrl);
    var episodeMetadata = showtime.JSONDecode(getEpisodeResponse);
    var renditions = episodeMetadata.renditions;
    page.type = 'video';
    var bestDefUrl = "";
    var bestDefFrameWidth = 0;
    renditions.forEach(function(rendition) {
        showtime.trace("rendition width: " + rendition.frameWidth);
        if(rendition.frameWidth > bestDefFrameWidth) {
          bestDefFrameWidth = rendition.frameWidth;
          bestDefUrl = rendition.url;
        }
    });
    showtime.trace("Playing best definition @ " + bestDefFrameWidth + " from : " + bestDefUrl);
    page.source = bestDefUrl;
    page.loading = false;
  });

})(this);
