import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './App.css';
import 'moment/locale/cs';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
moment.locale('cs');

const DragAndDropCalendar = withDragAndDrop(Calendar)

const localizer = momentLocalizer(moment);

export default function RopimCalendar() {

  const {defaultDate} = useMemo(() => ({
    defaultDate: new Date(2024, 0, 1)
  }), [])
  const [eventsList, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); // To store the currently selected event
  const [isHovered, setIsHovered] = useState(false); // State to track hover status

  useEffect(() => {

    fetch('http://localhost:5000/eventsList')
      .then(response => response.json())
      .then(data => {
        const parsedEvents = data.map(event => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          
          // Adjust for all-day events
          // if (event.allDay) {
          //   start.setHours(0, 0, 0, 0); // Set to midnight
          //   end.setHours(23, 59, 59, 999); // Set to end of day
          // }

          return { ...event, start, end };
        });

        setEvents(parsedEvents);
      })
      .catch(error => console.error('Error fetching events:', error));
  }, []);


  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  function handleAllDayInputEvent(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime(); 
  let allDay = false;
    if (endTime - startTime === 24 * 60 * 60 * 1000) {
      end = new Date(start);
      end.setHours(23, 59, 59, 0);
      allDay = true;
    }
    return { end, allDay };
  }

  // Create a new event
  const handleSelectSlot = ({ start, end }) => {
    const title = prompt('Zadejte název události');  

    console.log(start, end);

    const { end: adjustedEnd, allDay } = handleAllDayInputEvent(start, end); 

    const localStart = formatLocalDate(start);
    const localEnd = formatLocalDate(adjustedEnd);
    
    if (title) {

      const newEvent = {
        title,
        start: localStart, 
        end: localEnd,
        allDay: allDay,
      };
  
      // Send the event to the backend
      fetch('http://localhost:5000/eventsList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent),
      })
      .then(response => response.json())
      .then(data => {
        setEvents(prevEvents => {
          return [...prevEvents, data];
        });
      })
      .catch(error => console.error('Error creating event:', error));
    }
  };

  // Edit an existing event
  const handleSelectEvent = (event) => {
    const newTitle = prompt('Edit event title', event.title);
    if (newTitle !== null) {
      const updatedEvent = {
        ...event,
        title: newTitle,
      };

      fetch(`http://localhost:5000/eventsList/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEvent),
      })
        .then(response => response.json())
        .then(data => {
          setEvents(prevEvents =>
            prevEvents.map(e => (e.id === event.id ? updatedEvent : e))
          );
        })
        .catch(error => console.error('Error updating event:', error));
    }
  };

  // Delete an event
  const handleDeleteEvent = (event) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      fetch(`http://localhost:5000/eventsList/${event.id}`, {
        method: 'DELETE',
      })
        .then(() => {
          setEvents(prevEvents => prevEvents.filter(e => e.id !== event.id));
          setSelectedEvent(null); // Close event details
        })
        .catch(error => console.error('Error deleting event:', error));
    }
  };

  // Handle click on an event (show delete and edit options)
  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  // Start animation when mouse enters
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Stop animation with delay when mouse leaves
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const [myEvents, setMyEvents] = useState(eventsList)

  const moveEvent = useCallback(
    ({ event, start, end, isAllDay: droppedOnAllDaySlot = false }) => {
      const { allDay } = event
      if (!allDay && droppedOnAllDaySlot) {
        event.allDay = true
      }
      if (allDay && !droppedOnAllDaySlot) {
          event.allDay = false;
      }

      setMyEvents((prev) => {
        const existing = prev.find((ev) => ev.id === event.id) ?? {}
        const filtered = prev.filter((ev) => ev.id !== event.id)
        return [...filtered, { ...existing, start, end, allDay: event.allDay }]
      })
    },
    [setMyEvents]
  )

  const resizeEvent = useCallback(
    ({ event, start, end }) => {
      setMyEvents((prev) => {
        const existing = prev.find((ev) => ev.id === event.id) ?? {}
        const filtered = prev.filter((ev) => ev.id !== event.id)
        return [...filtered, { ...existing, start, end }]
      })
    },
    [setMyEvents]
  )

  const messages = {
    allDay: 'Celý den',
    previous: 'Předchozí',
    next: 'Další',
    today: 'Dnes',
    month: 'Měsíc',
    week: 'Týden',
    day: 'Den',
    agenda: 'Agenda',
    date: 'Datum',
    time: 'Čas',
    event: 'Událost',
    showMore: (total) => `+ Zobrazit více (${total})`,
  };

  const formats = {
    agendaDateFormat: 'ddd D. MMMM YYYY',
    dayHeaderFormat: 'D. MMMM YYYY',
    dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
      localizer.format(start, 'D. MMMM YYYY', culture) + ' – ' + localizer.format(end, 'D. MMMM YYYY', culture),
  };


  return (
    <div className="calendar-container">
      <div
        className="image-row"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src="/logo.png"
          alt="Logo"
          className={`App-logo ${isHovered ? 'swing' : ''}`} 
        />
      </div>
      <DragAndDropCalendar     
        localizer={localizer}
        events={eventsList}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 700, width: 1200, justifySelf: 'center' }}
        onSelectSlot={handleSelectSlot}  // Create new event on slot click
        onSelectEvent={handleEventClick}  // Show event details on click
        onEventDrop={moveEvent}
        onEventResize={resizeEvent}
        messages={messages}
        popup="true"
        selectable
        formats={formats}
        allDayMaxRows={3}
      />

      {selectedEvent && (
        <div className="event-details" style={{ height: 700, width: 1200, justifySelf: 'center' }}>¨
        <gov-button color="primary" type="solid">Click me, Iam gov Button</gov-button>
          <h3>Detail události</h3>
          <p><strong>Název:</strong> {selectedEvent.title}</p>
          <p><strong>Začátek:</strong> {moment(selectedEvent.start).format('Do MMMM YYYY HH:mm')}</p>
          <p><strong>Konec:</strong> {moment(selectedEvent.end).format('Do MMMM YYYY HH:mm')}</p>
          <span>
          <button className="rbc-btn" onClick={() => handleSelectEvent(selectedEvent)}>Upravit</button>
          <button className="rbc-btn" onClick={() => handleDeleteEvent(selectedEvent)}>Smazat</button>
          </span>
        </div>
      )}
    </div>
  );
}