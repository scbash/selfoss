/**
 * initialize events for entries
 */
selfoss.events.entries = function(e) {

    // show/hide entry
    var target = selfoss.isMobile() ? '.entry' : '.entry-title';
    $(target).unbind('click').click(function() {
        var parent = ((target == '.entry') ? $(this) : $(this).parent());
        
        if(selfoss.isSmartphone()==false) {
            $('.entry.selected').removeClass('selected');
            parent.addClass('selected');
        }
        
        // prevent event on fullscreen touch
        if(parent.hasClass('fullscreen'))
            return;
        
        var autoMarkAsRead = $('#config').data('auto_mark_as_read')=="1" && parent.hasClass('unread');
        
        // anonymize
        selfoss.anonymize(parent.find('.entry-content'));
        
         // show entry in popup
        if(selfoss.isSmartphone()) {
            location.hash = "show";
            
            // hide nav
            if($('#nav').is(':visible')) {
                var scrollTop = $(window).scrollTop();
                scrollTop = scrollTop - $('#nav').height();
                scrollTop = scrollTop<0 ? 0 : scrollTop;
                $(window).scrollTop(scrollTop);
                $('#nav').hide();
            }
            
            // save scroll position and hide content
            var scrollTop = $(window).scrollTop();
            var content = $('#content');
            $(window).scrollTop(0);
            content.hide();
            
            // show fullscreen
            var fullscreen = $('#fullscreen-entry');
            fullscreen.html('<div id="entrr'+parent.attr('id').substr(5)+'" class="entry fullscreen">'+parent.html()+'</div>');
            if(!fullscreen.hasClass('entry-animate')) {
                fullscreen.show();
            }
            
            // set events for fullscreen
            selfoss.events.entriesToolbar(fullscreen);
            
            // set color of all tags by background color
            fullscreen.find('.entry-tags-tag').colorByBrightness();
    
            // set events for closing fullscreen
            fullscreen.find('.entry-close').click(function(e) {
                if(e.target.tagName.toLowerCase()=="a")
                    return;
                content.show();
                location.hash = "";
                $(window).scrollTop(scrollTop);
                fullscreen.hide();
            });
            
            // bind entry content to a TouchSwipe object, listening for swipes
            fullscreen.find('.entry-content').swipe({
                // swipe to advance to navigate forward/backward
                swipe:function(event, direction, distance, duration, fingerCount) {
                    var fullscreen = $('#fullscreen-entry');
                    if(fullscreen.is(':visible')) {
                        // find the next entry
                        var id = fullscreen.find('.entry').attr('id').substr(5);
                        var old = $("#entry"+id);
                        var other_way;
                        if(direction == 'left') {
                            // lifted directly from shortcuts.nextprev
                            if(old.length==0) {
                                current = $('.entry:eq(0)');
                            } else {
                                current = old.next().length==0 ? old : old.next();
                            }
                            other_way = 'right';
                        }
                        else if(direction == 'right') {
                            if(old.length==0) {
                                current = $('.entry:eq(0)');
                            } else {
                                current = old.prev().length==0 ? old : old.prev();
                            }
                            other_way = 'left';
                        }

                        if(current == old) {
                            // If we're at the end of the stream, just bounce back
                            fullscreen.animate({left:0},300);
                        }
                        else {
                            // close the currently open entry
                            fullscreen.addClass('entry-animate');
                            fullscreen.find('.entry-close').click();

                            // open the next entry
                            current.click();
                            fullscreen.css({left: '0px'});

                            // Animate next entry on
                            fullscreen.show('slide',
                                            { direction: other_way,
                                              distance: 0.5*fullscreen.width() },
                                            250,
                                            function() {
                                                fullscreen.find('.entry-content').lazyLoadImages()
                                            }
                            );
                            fullscreen.removeClass('entry-animate');
                        }
                    }
                },

                // animate div during swipe
                swipeStatus:function(event, phase, direction, distance) {
                    var fullscreen = $('#fullscreen-entry');
                    if(phase=='move' && (direction=='left' || direction=='right')) {
                        if(direction == 'left')
                            fullscreen.animate({left:'-'+distance+'px'}, 0)  // zero time, just follow input
                        else if(direction == 'right')
                            fullscreen.animate({left:distance+'px'}, 0)
                    }
                    else if(phase == 'cancel') {
                        fullscreen.animate({left:0},300);
                    }
                    else if(phase =='end') {
                        // if the user didn't trigger a swipe, reset back to start
                        if(distance < fullscreen.find('.entry-content').swipe('option', 'threshold'))
                            fullscreen.animate({left:0},300);
                    }
                },

                // distance required to be declared a swipe
                threshold: 100,

                // allow the entry to scroll vertically (i.e. pass vertical swipe events to browser)
                allowPageScroll: 'vertical',
            });

            // automark as read
            if(autoMarkAsRead) {
                fullscreen.find('.entry-unread').click();
            }

            // load any images
            if(!fullscreen.hasClass('entry-animate')) {
                fullscreen.find('.entry-content').lazyLoadImages()
            }

        // open entry content
        } else {
            var content = parent.find('.entry-content');
            
            // show/hide (with toolbar)
            if(content.is(':visible')) {
                parent.find('.entry-toolbar').hide();
                content.hide();
            } else {
                content.show();
                selfoss.events.entriesToolbar(parent);
                parent.find('.entry-toolbar').show();
                
                // automark as read
                if(autoMarkAsRead) {
                    parent.find('.entry-unread').click();
                }
            }
            
            content.lazyLoadImages();
        } 
    });

    // no source click
    if(selfoss.isSmartphone())
        $('.entry-source, .entry-icon').unbind('click').click(function(e) {e.preventDefault(); return false });
    
    // scroll load more
    $(window).unbind('scroll').scroll(function() {
        if($('#content').is(':visible')==false)
            return;
    
        var content = $('#content');
        if($('.stream-more').length > 0 
           && $('.stream-more').position().top < $(window).height() + $(window).scrollTop() 
           && $('.stream-more').hasClass('loading')==false)
            $('.stream-more').click();
    });
    
    // more
    $('.stream-more').unbind('click').click(function () {
        var streamMore = $(this);
        selfoss.filter.offset += selfoss.filter.itemsPerPage;
        
        streamMore.addClass('loading');
        $.ajax({
            url: $('base').attr('href'),
            type: 'GET',
            dataType: 'json',
            data: selfoss.filter,
            success: function(data) {
                $('.stream-more').replaceWith(data.entries);
                selfoss.events.entries();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                streamMore.removeClass('loading');
                alert('Load more error: '+errorThrown);
            }
        });
    });
    
    // set color of all tags by background color
    $('.entry-tags-tag').colorByBrightness();
    
    // click a tag
    $('.entry-tags-tag').unbind('click').click(function() {
        var tag = $(this).html();
        $('#nav-tags .tag').each(function(index, item) {
            if($(item).html()==tag) {
                $(item).click();
                return false;
            }
        });
    });
};
