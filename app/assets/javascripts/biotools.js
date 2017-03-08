var Biotools = {
    baseUrl: 'https://bio.tools',
    titleElement: function() {
        return $('#' + $('#title_element').val())
    },
    sortParameter: function() {
        return 'sort=score';
    },
    queryParameter: function() {
        return 'q=' + encodeURIComponent($('#tool_query').val());
    },
    perPage: function(){
        return 'per_page=5'
    },
    apiBaseURL: function(){
        return Biotools.baseUrl + '/api/tool';
    },
    websiteBaseURL: function(){
        return Biotools.baseUrl + '/tool';
    },
    search: function(){
        $('#biotools-results').empty();
        Biotools.queryAPI(Biotools.apiBaseURL() + '?' + Biotools.queryParameter() + '&' + Biotools.sortParameter());
    },
    nextPage: function(){
        var next_page = $(event.target).attr('data-next');
        if (next_page){
            Biotools.queryAPI(Biotools.apiBaseURL() + next_page + '&' + Biotools.queryParameter() + '&' + Biotools.sortParameter());
        } else {
            /* display nice 'were out of tools  message here */
        }
    },
    queryAPI: function(api_url){
        $.get(api_url, function (json) {
            Biotools.displayTools(json);
        });
    }, 
    associateTool: function(event){
        obj = $(event.target);
        ExternalResources.add(obj.data('title'), obj.data('url'));
        obj.parent().parent().fadeOut();
    },
    displayTools: function(json){
        var items = json.list;
        $.each(items, function (index, item) {
            var url = Biotools.websiteBaseURL() + '/' + item.id;
            $('#biotools-results').append('' +
                '<div id="' + item.id + '" class="col-md-12 col-sm-12 bounding-box" data-toggle=\"tooltip\" data-placement=\"top\" aria-hidden=\"true\" title=\"' + item.description + '\">' +
                '<h4>' +
                    '<i class="fa fa-wrench"></i> ' +
                    '<a href="' + url + '">' +
                        '<span class="title">' +
                            item.name +
                        '</span>' +
                    '</a>' +
                    ' <i id="' + item.id + '" ' +
                    'class="fa fa-plus-square-o associate-tool"/ ' +
                    'title="click to associate ' + item.name + ' with this resource"' +
                    'data-title="' + item.name + '" data-url="' + url + '"/>' +
                '</h4>' +
                '<span>' + item.description + '</span>' +
                    '<div class="external-links">' +
                        '<a class="btn btn-warning" target="_blank" href="' + Biotools.websiteBaseURL() + '/' + item.id +'">' +
                        'View ' + item.name + ' on bio.tools ' +
                        '<i class="fa fa-external-link"/></a>' +
                    '</div>' +
                '</div>');
        });
        $('#next-tools-button').attr('data-next', json.next);
    },
    copyTitleAndSearch: function(){
        $('#tool_query').val(Biotools.titleElement().val());
        Biotools.search();
    },
    displayToolInfo: function(id){
        var res = {};
            $.getJSON((Biotools.apiBaseURL() + '/' + id), function(data){
                var res = {};
                res['topics'] = [];
                $.each(data.topic, function(index, topic){
                    console.log(topic)
                    res['topics'].push('<a href="' + topic.uri +'" class="label label-default filter-button">' + topic.term + '</a>');
                });
                $('#tool-topics-' + id).html('<div>' + res['topics'].join(' ') + '</div>')
                $('#tool-description-' + id).html(data.description)
                return res
            })
    },
    displayFullTool: function(api, id){
        var json = $.get(api, function(json) {
            var json_object = json;
            $('#' + id + '-desc').text(json_object.description);
            $('#' + id + '-resource-type-icon').addClass('fa-wrench').removeClass('fa-external-link');
            $.each(json_object.topic, function(index, topic){
                $('#' + id + '-topics').append(
                    '<span class="btn btn-default keyword-button">' +
                    '<a href="' + topic.uri + '" target="_blank">' + topic.term + '</a>' +
                    '</span>'
                );
            });
            $('#' + id + '-external-links').append(
                '<div>' +
                    '<a class="btn btn-success" target="_blank" href="' + json_object.homepage +'">' +
                    'View the ' + json_object.name + ' homepage ' +
                    '<i class="fa fa-external-link"/></a>' +
                    '</a>' +
                    '<a class="btn btn-warning" target="_blank" href="' + Biotools.websiteBaseURL() + '/' + json_object.id +'">' +
                    'View ' + json_object.name + ' on bio.tools ' +
                    '<i class="fa fa-external-link"/></a>' +
                '</div>'
            );
        });
    }
};

$(document).ready(function () {
    $('#next-tools-button').click(Biotools.nextPage);
    $('#tool_query').keyup(Biotools.search);
    $('#search_tools').click(Biotools.search);
    $('#biotools-results').on('click','.associate-tool', Biotools.associateTool);
    $('#external-resources').on('change', '.delete-external-resource-btn input.destroy-attribute', ExternalResources.delete);
    Biotools.titleElement().keyup(Biotools.copyTitleAndSearch);
    Biotools.copyTitleAndSearch();
    Biotools.queryAPI(Biotools.apiBaseURL() + '?' + Biotools.queryParameter() + '&' + Biotools.sortParameter());
});


