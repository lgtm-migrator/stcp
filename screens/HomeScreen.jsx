import React, { Component } from 'react'
import { Text } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import PropTypes from 'prop-types'
import StopCard from '../components/StopCard'
import Styles, { Container } from '../constants/Styles'
import { loadStops, distance } from '../constants/AuxFunctions'

function renderStopCard({ item }) {
  const { stop, provider, favName } = item

  return <StopCard stopCode={favName || stop} provider={provider} />
}

export default class HomeScreen extends Component {
  constructor(props) {
    super(props)
    this.state = { location: undefined, stopsList: undefined }
  }

  componentDidMount() {
    this.updateLocation()
  }

  getSortedList() {
    const { location, stopsList } = this.state
    const sortedList = stopsList.sort(({ coords: cA }, { coords: cB }) => {
      return distance(location, cA) - distance(location, cB)
    })

    return sortedList
  }

  setLocation = position => {
    try {
      const { coords } = position
      const { latitude, longitude } = coords

      this.setState({ location: { lat: latitude, lon: longitude } })
    } catch (error) {
      console.log(error)
    }
  }

  updateLocation() {
    navigator.geolocation.getCurrentPosition(this.setLocation)
    const { navigation } = this.props
    this.loadStops()

    this.focusListener = navigation.addListener('didFocus', () => {
      this.loadStops()
      setTimeout(() => this.loadStops(), 50)
    })
  }

  async loadStops() {
    const stops = await loadStops()
    this.setState({ stopsList: stops })
  }

  renderList() {
    const { location, stopsList } = this.state

    if (stopsList !== undefined && stopsList.length !== 0) {
      const stops = location === undefined ? stopsList : this.getSortedList()

      return (
        <FlatList
          style={Styles.tabsContainer}
          showsHorizontalScrollIndicator={false}
          horizontal
          data={stops}
          keyExtractor={({ stop, provider }) => `${stop}_${provider}`}
          renderItem={renderStopCard}
        />
      )
    }
    return <Text style={Styles.getStartedText}>Add some stops! 😊</Text>
  }

  render() {
    return <Container>{this.renderList()}</Container>
  }
}

HomeScreen.navigationOptions = {
  title: 'Stops',
}

HomeScreen.defaultState = {
  stopsList: undefined,
  location: undefined,
}

HomeScreen.propTypes = {
  navigation: PropTypes.shape({
    addListener: PropTypes.func.isRequired,
  }).isRequired,
}

renderStopCard.propTypes = {
  item: PropTypes.shape({
    stop: PropTypes.string.isRequired,
    provider: PropTypes.string.isRequired,
    favName: PropTypes.string,
  }).isRequired,
}
